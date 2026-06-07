import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';

import { PrismaService } from '../../prisma/prisma.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [latestDeploy, activeRelease, recentErrorCount, branch, commit] = await Promise.all([
      this.prisma.deployLog.findFirst({ orderBy: { startedAt: 'desc' } }),
      this.prisma.appRelease.findFirst({
        where: { platform: 'android', isActive: true },
        orderBy: { buildNumber: 'desc' },
      }),
      this.prisma.apiErrorLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.git(['rev-parse', '--abbrev-ref', 'HEAD']),
      this.git(['rev-parse', 'HEAD']),
    ]);

    return {
      environment: process.env.NODE_ENV ?? 'development',
      gitBranch: branch,
      gitCommit: commit,
      latestDeploy,
      activeRelease,
      recentErrorCount,
    };
  }

  private async git(args: string[]) {
    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd: process.cwd(),
      });
      return stdout.trim();
    } catch {
      return '';
    }
  }
}
