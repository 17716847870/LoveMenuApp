import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { execFile } from 'child_process';
import { promisify } from 'util';

import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuditService } from '../audit.service';
import { CurrentAdmin } from '../current-admin.decorator';
import { AdminSettingsService } from '../settings/admin-settings.service';
import { AdminDeploymentsRealtimeService } from './admin-deployments-realtime.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class AdminDeploymentsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
    private readonly settingsService: AdminSettingsService,
    private readonly realtimeService: AdminDeploymentsRealtimeService,
  ) {}

  async onModuleInit() {
    await this.markTimedOutDeployments().catch((error) => {
      if (this.isMissingDeployLogTable(error)) {
        console.warn('deploy_logs table does not exist yet; skip deployment timeout recovery');
        return;
      }

      throw error;
    });
  }

  async create(input: { branch?: string; target_commit?: string }, admin: CurrentAdmin, request: RequestWithContext) {
    await this.markTimedOutDeployments();
    const running = await this.prisma.deployLog.findFirst({
      where: { status: 'running' },
    });
    if (running) {
      throw new BadRequestException('已有部署任务正在运行');
    }

    const settings = await this.settingsService.getDeploymentSettings();
    const scriptPath = settings.script_path;
    const workdir = settings.workdir || process.cwd();

    if (!scriptPath) {
      throw new BadRequestException('请先在系统设置中配置部署脚本路径');
    }
    if (!workdir) {
      throw new BadRequestException('请先在系统设置中配置部署工作目录');
    }
    if (!settings.health_url) {
      throw new BadRequestException('请先在系统设置中配置部署健康检查 URL');
    }
    const branch = input.branch?.trim();
    const targetCommit = input.target_commit?.trim();
    if (!branch) {
      throw new BadRequestException('请选择要部署的分支');
    }
    if (!targetCommit) {
      throw new BadRequestException('请选择要部署的 commit');
    }

    const beforeCommit = await this.git(['rev-parse', 'HEAD'], workdir);
    const deployLog = await this.prisma.deployLog.create({
      data: {
        status: 'running',
        branch,
        beforeCommit,
        targetCommit,
        startedBy: admin.adminUserId,
        logText: '',
      },
    });

    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'deployment.create',
      targetType: 'deploy_log',
      targetId: deployLog.id,
      summary: `触发服务器部署：${branch} ${targetCommit.slice(0, 12)}`,
      request,
    });

    this.runDeployment(deployLog.id, scriptPath, workdir, branch, targetCommit, settings.timeout_seconds, settings.health_url);
    return deployLog;
  }

  async refs(branch?: string) {
    const settings = await this.settingsService.getDeploymentSettings();
    const workdir = settings.workdir;
    if (!workdir) {
      throw new BadRequestException('请先在系统设置中配置部署工作目录');
    }
    await this.git(['fetch', 'origin', '--prune'], workdir);
    const branches = (await this.git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'], workdir))
      .split('\n')
      .map((item) => item.replace(/^origin\//, '').trim())
      .filter((item) => item && item !== 'HEAD' && item !== 'origin');
    const selectedBranch = branch || (branches.includes('main') ? 'main' : branches[0]) || 'main';
    const commits = (
      await this.git(['log', '--pretty=format:%H%x09%h%x09%ci%x09%s', `origin/${selectedBranch}`, '-n', '30'], workdir)
    )
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, date, subject] = line.split('\t');
        return { hash, shortHash, date, subject };
      });

    return {
      branches,
      selectedBranch,
      commits,
    };
  }

  async list() {
    return this.prisma.deployLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  async current() {
    return this.prisma.deployLog.findFirst({
      where: { status: 'running' },
      orderBy: { startedAt: 'desc' },
    });
  }

  async get(id: bigint) {
    const deployLog = await this.prisma.deployLog.findUnique({
      where: { id },
    });
    if (!deployLog) {
      throw new NotFoundException('部署记录不存在');
    }
    return deployLog;
  }

  private runDeployment(
    id: bigint,
    scriptPath: string,
    workdir: string,
    branch: string,
    targetCommit: string,
    timeoutSeconds: number,
    healthUrl: string,
  ) {
    void this.appendLog(id, '开始部署任务');
    const child = execFile(scriptPath, {
      cwd: workdir,
      timeout: this.getTimeoutMs(timeoutSeconds),
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        ADMIN_DEPLOY_WORKDIR: workdir,
        ADMIN_DEPLOY_HEALTH_URL: healthUrl,
        ADMIN_DEPLOY_BRANCH: branch,
        ADMIN_DEPLOY_REF: targetCommit,
      },
    });

    void this.prisma.deployLog.update({
      where: { id },
      data: { processId: child.pid },
    });

    child.stdout?.on('data', (chunk) => {
      void this.appendLog(id, chunk.toString());
    });
    child.stderr?.on('data', (chunk) => {
      void this.appendLog(id, chunk.toString());
    });
    child.on('error', (error) => {
      void this.finish(id, 'failed', error.message);
    });
    child.on('close', async (code) => {
      const workdirCommit = await this.git(['rev-parse', 'HEAD'], workdir);
      await this.prisma.deployLog.update({
        where: { id },
        data: {
          status: code === 0 ? 'success' : 'failed',
          targetCommit: workdirCommit,
          errorMessage: code === 0 ? null : `部署脚本退出码：${code}`,
          finishedAt: new Date(),
        },
      });
      await this.appendLog(id, code === 0 ? '部署完成' : `部署失败，退出码：${code}`, code === 0 ? 'success' : 'failed');
    });
  }

  private async appendLog(id: bigint, text: string, status?: string) {
    const formattedText = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => this.realtimeService.formatLine(line))
      .join('\n');
    if (!formattedText) {
      return;
    }
    const current = await this.prisma.deployLog.findUnique({
      where: { id },
      select: { logText: true },
    });
    await this.prisma.deployLog.update({
      where: { id },
      data: {
        logText: `${current?.logText ?? ''}${formattedText}\n`,
      },
    });
    this.realtimeService.publish({
      deployId: id.toString(),
      line: formattedText,
      status,
    });
  }

  private async finish(id: bigint, status: 'failed' | 'success', errorMessage?: string) {
    await this.prisma.deployLog.update({
      where: { id },
      data: {
        status,
        errorMessage,
        finishedAt: new Date(),
      },
    });
  }

  private async markTimedOutDeployments() {
    const settings = await this.settingsService.getDeploymentSettings();
    const threshold = new Date(Date.now() - this.getTimeoutMs(settings.timeout_seconds));
    await this.prisma.deployLog.updateMany({
      where: {
        status: 'running',
        startedAt: {
          lt: threshold,
        },
      },
      data: {
        status: 'failed',
        errorMessage: '部署任务超时或服务重启后未完成',
        finishedAt: new Date(),
      },
    });
  }

  private async git(args: string[], cwd: string) {
    try {
      const { stdout } = await execFileAsync('git', args, { cwd });
      return stdout.trim();
    } catch {
      return '';
    }
  }

  private getTimeoutMs(timeoutSeconds?: number) {
    return Number(timeoutSeconds || 600) * 1000;
  }

  private isMissingDeployLogTable(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
  }
}
