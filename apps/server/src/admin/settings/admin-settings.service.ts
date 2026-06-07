import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuditService } from '../audit.service';
import { CurrentAdmin } from '../current-admin.decorator';

export type DeploymentSettings = {
  script_path: string;
  workdir: string;
  timeout_seconds: number;
  health_url: string;
};

export const DEPLOYMENT_SETTINGS_KEY = 'admin.deployment';

const ENV_CHECK_ITEMS = [
  { key: 'DATABASE_URL', required: true, group: 'database', remark: 'PostgreSQL 数据库连接地址' },
  { key: 'PORT', required: true, group: 'server', remark: '后端服务监听端口' },
  { key: 'JWT_SECRET', required: true, group: 'auth', remark: 'App 用户登录 token 签名密钥' },
  { key: 'ADMIN_JWT_SECRET', required: true, group: 'admin', remark: '后台管理员 token 签名密钥' },
  { key: 'ADMIN_JWT_EXPIRES_IN', required: false, group: 'admin', remark: '后台管理员 token 有效期' },
  { key: 'ADMIN_ALLOWED_ORIGIN', required: false, group: 'admin', remark: '后台 Web 允许跨域来源' },
  { key: 'API_ERROR_LOG_RETENTION_DAYS', required: false, group: 'admin', remark: '接口错误日志保留天数' },
  { key: 'OSS_REGION', required: false, group: 'oss', remark: '阿里云 OSS 区域' },
  { key: 'OSS_ACCESS_KEY_ID', required: false, group: 'oss', remark: 'OSS AccessKey ID' },
  { key: 'OSS_ACCESS_KEY_SECRET', required: false, group: 'oss', remark: 'OSS AccessKey Secret' },
  { key: 'OSS_BUCKET', required: false, group: 'oss', remark: 'OSS Bucket 名称' },
  { key: 'OSS_PUBLIC_BASE_URL', required: false, group: 'oss', remark: 'OSS 公开访问基础 URL' },
  { key: 'OSS_UPLOAD_URL_EXPIRES_SECONDS', required: false, group: 'oss', remark: 'OSS 上传签名 URL 有效秒数' },
  { key: 'OSS_READ_URL_EXPIRES_SECONDS', required: false, group: 'oss', remark: 'OSS 读取签名 URL 有效秒数' },
  { key: 'APK_MAX_SIZE_MB', required: false, group: 'release', remark: '后台上传 APK 文件大小上限 MB' },
  { key: 'APK_PUBLIC_BASE_URL', required: false, group: 'release', remark: 'APK 公开下载基础 URL' },
  { key: 'OPENAI_API_KEY', required: false, group: 'ai', remark: 'OpenAI API 密钥' },
  { key: 'OPENAI_BASE_URL', required: false, group: 'ai', remark: 'OpenAI API 基础地址' },
  { key: 'OPENAI_MODEL', required: false, group: 'ai', remark: '默认 OpenAI 模型' },
  { key: 'ALIYUN_SMS_ACCESS_KEY_ID', required: false, group: 'sms', remark: '阿里云短信 AccessKey ID' },
  { key: 'ALIYUN_SMS_ACCESS_KEY_SECRET', required: false, group: 'sms', remark: '阿里云短信 AccessKey Secret' },
  { key: 'ALIYUN_SMS_SIGN_NAME', required: false, group: 'sms', remark: '短信签名名称' },
  { key: 'ALIYUN_SMS_TEMPLATE_CODE', required: false, group: 'sms', remark: '短信验证码默认模板' },
  { key: 'ALIYUN_SMS_TEMPLATE_CODE_LOGIN_REGISTER', required: false, group: 'sms', remark: '登录注册验证码模板' },
  { key: 'ALIYUN_SMS_TEMPLATE_CODE_CHANGE_PHONE', required: false, group: 'sms', remark: '换绑手机号验证码模板' },
  { key: 'ALIYUN_SMS_TEMPLATE_CODE_RESET_PASSWORD', required: false, group: 'sms', remark: '重置密码验证码模板' },
  { key: 'ALIYUN_SMS_TEMPLATE_CODE_BIND_NEW_PHONE', required: false, group: 'sms', remark: '绑定新手机号验证码模板' },
  { key: 'ALIYUN_SMS_TEMPLATE_CODE_VERIFY_BOUND_PHONE', required: false, group: 'sms', remark: '验证已绑定手机号验证码模板' },
  { key: 'ALIYUN_SMS_REGION', required: false, group: 'sms', remark: '阿里云短信区域' },
  { key: 'ALIYUN_SMS_ENDPOINT', required: false, group: 'sms', remark: '阿里云短信 endpoint' },
];

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  async getDeploymentSettings(): Promise<DeploymentSettings> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: DEPLOYMENT_SETTINGS_KEY },
    });
    const value = setting?.valueJson;

    return {
      script_path: '',
      workdir: '',
      timeout_seconds: 600,
      health_url: '',
      ...(value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<DeploymentSettings>) : {}),
    };
  }

  async updateDeploymentSettings(
    payload: Partial<DeploymentSettings>,
    admin: CurrentAdmin,
    request: RequestWithContext,
  ) {
    const before = await this.getDeploymentSettings();
    const next = this.normalizeDeploymentSettings(payload, before);
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: DEPLOYMENT_SETTINGS_KEY },
      create: {
        key: DEPLOYMENT_SETTINGS_KEY,
        valueJson: next as unknown as Prisma.InputJsonValue,
        description: '后台部署配置',
        updatedBy: admin.adminUserId,
      },
      update: {
        valueJson: next as unknown as Prisma.InputJsonValue,
        updatedBy: admin.adminUserId,
      },
    });

    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'settings.update_deployment',
      targetType: 'system_setting',
      targetId: setting.id,
      summary: '修改后台部署配置',
      before,
      after: next,
      request,
    });

    return next;
  }

  envCheck() {
    return ENV_CHECK_ITEMS.map((item) => {
      const value = process.env[item.key];
      return {
        key: item.key,
        group: item.group,
        required: item.required,
        remark: item.remark,
        configured: Boolean(value && value.trim()),
      };
    });
  }

  private normalizeDeploymentSettings(payload: Partial<DeploymentSettings>, fallback: DeploymentSettings) {
    return {
      script_path: String(payload.script_path || fallback.script_path || '').trim(),
      workdir: String(payload.workdir || fallback.workdir || '').trim(),
      timeout_seconds: Number(payload.timeout_seconds || fallback.timeout_seconds || 600),
      health_url: String(payload.health_url || fallback.health_url || '').trim(),
    };
  }
}
