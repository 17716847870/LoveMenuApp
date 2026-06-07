import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import OSS = require('ali-oss');
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';

import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuditService } from '../audit.service';
import { CurrentAdmin } from '../current-admin.decorator';

type ReleasePayload = {
  platform?: string;
  version_name?: string;
  build_number?: number | string;
  title?: string;
  release_notes?: string[] | string;
  download_url?: string;
  file_size?: number | string;
  sha256?: string;
  is_force_update?: boolean;
};

type UploadedApk = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class AdminAppReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AdminAuditService,
  ) {}

  async list(query: { platform?: string; status?: string }) {
    return this.prisma.appRelease.findMany({
      where: {
        platform: query.platform || undefined,
        status: query.status || undefined,
      },
      orderBy: [{ platform: 'asc' }, { buildNumber: 'desc' }],
    });
  }

  async get(id: bigint) {
    const release = await this.prisma.appRelease.findUnique({ where: { id } });
    if (!release) {
      throw new NotFoundException('版本不存在');
    }
    return release;
  }

  async create(payload: ReleasePayload, admin: CurrentAdmin, request: RequestWithContext) {
    const data = this.toReleaseCreateData(payload);
    const release = await this.prisma.appRelease.create({
      data: {
        ...data,
        createdByAdminId: admin.adminUserId,
      },
    });
    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'app_release.create',
      targetType: 'app_release',
      targetId: release.id,
      summary: `新增版本 ${release.platform} ${release.versionName}`,
      after: release,
      request,
    });
    return release;
  }

  async update(id: bigint, payload: ReleasePayload, admin: CurrentAdmin, request: RequestWithContext) {
    const before = await this.get(id);
    const release = await this.prisma.appRelease.update({
      where: { id },
      data: this.toReleaseUpdateData(payload),
    });
    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'app_release.update',
      targetType: 'app_release',
      targetId: release.id,
      summary: `编辑版本 ${release.platform} ${release.versionName}`,
      before,
      after: release,
      request,
    });
    return release;
  }

  async activate(id: bigint, admin: CurrentAdmin, request: RequestWithContext) {
    const before = await this.get(id);
    const release = await this.prisma.$transaction(async (tx) => {
      await tx.appRelease.updateMany({
        where: {
          platform: before.platform,
          id: { not: before.id },
        },
        data: {
          isActive: false,
        },
      });
      return tx.appRelease.update({
        where: { id },
        data: {
          isActive: true,
          status: 'published',
          publishedAt: new Date(),
        },
      });
    });
    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'app_release.activate',
      targetType: 'app_release',
      targetId: release.id,
      summary: `启用版本 ${release.platform} ${release.versionName}`,
      before,
      after: release,
      request,
    });
    return release;
  }

  async deactivate(id: bigint, admin: CurrentAdmin, request: RequestWithContext) {
    const before = await this.get(id);
    const release = await this.prisma.appRelease.update({
      where: { id },
      data: { isActive: false },
    });
    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'app_release.deactivate',
      targetType: 'app_release',
      targetId: release.id,
      summary: `停用版本 ${release.platform} ${release.versionName}`,
      before,
      after: release,
      request,
    });
    return release;
  }

  async archive(id: bigint, admin: CurrentAdmin, request: RequestWithContext) {
    const before = await this.get(id);
    const release = await this.prisma.appRelease.update({
      where: { id },
      data: { status: 'archived', isActive: false },
    });
    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'app_release.archive',
      targetType: 'app_release',
      targetId: release.id,
      summary: `归档版本 ${release.platform} ${release.versionName}`,
      before,
      after: release,
      request,
    });
    return release;
  }

  async uploadApk(file: UploadedApk | undefined, admin: CurrentAdmin, request: RequestWithContext) {
    if (!file) {
      throw new BadRequestException('APK 文件不能为空');
    }

    const maxSize = Number(this.configService.get<string>('APK_MAX_SIZE_MB') ?? 300) * 1024 * 1024;
    const ext = extname(file.originalname).toLowerCase();
    if (ext !== '.apk') {
      throw new BadRequestException('只允许上传 APK 文件');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('APK 文件超过大小限制');
    }

    if (file.buffer.subarray(0, 2).toString('hex') !== '504b') {
      throw new BadRequestException('APK 文件格式不正确');
    }

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const objectKey = this.createApkObjectKey(file.originalname);
    const uploadResult = await this.uploadToOss(objectKey, file);
    const downloadUrl = this.resolvePublicUrl(objectKey, uploadResult.url);

    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'app_release.upload_apk',
      targetType: 'apk',
      targetId: objectKey,
      summary: `上传 APK ${file.originalname}`,
      after: { objectKey, fileSize: file.size, sha256, downloadUrl },
      request,
    });

    return {
      objectKey,
      downloadUrl,
      fileSize: file.size,
      sha256,
    };
  }

  private toReleaseCreateData(payload: ReleasePayload): Prisma.AppReleaseUncheckedCreateInput {
    const data = this.toReleaseData(payload);
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === '') {
        throw new BadRequestException(`${key} 不能为空`);
      }
    }

    return data as Prisma.AppReleaseUncheckedCreateInput;
  }

  private toReleaseUpdateData(payload: ReleasePayload): Prisma.AppReleaseUncheckedUpdateInput {
    return this.toReleaseData(payload) as Prisma.AppReleaseUncheckedUpdateInput;
  }

  private toReleaseData(payload: ReleasePayload) {
    const releaseNotes = Array.isArray(payload.release_notes)
      ? payload.release_notes
      : typeof payload.release_notes === 'string'
        ? payload.release_notes
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    const data = {
      platform: payload.platform ?? 'android',
      versionName: payload.version_name,
      buildNumber: payload.build_number === undefined ? undefined : Number(payload.build_number),
      title: payload.title,
      releaseNotes: releaseNotes as Prisma.InputJsonValue,
      downloadUrl: payload.download_url,
      fileSize: payload.file_size === undefined ? undefined : BigInt(payload.file_size),
      sha256: payload.sha256,
      isForceUpdate: payload.is_force_update ?? false,
    };

    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  }

  private createApkObjectKey(filename: string) {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `lovemenu/apk/${yyyy}/${mm}/${dd}/${randomUUID()}-${filename.replace(/[^\w.-]/g, '-')}`;
  }

  private async uploadToOss(objectKey: string, file: UploadedApk) {
    const client = new OSS({
      region: this.requireConfig('OSS_REGION'),
      accessKeyId: this.requireConfig('OSS_ACCESS_KEY_ID'),
      accessKeySecret: this.requireConfig('OSS_ACCESS_KEY_SECRET'),
      bucket: this.requireConfig('OSS_BUCKET'),
      secure: true,
    });

    return client.put(objectKey, file.buffer, {
      mime: 'application/vnd.android.package-archive',
      headers: {
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }

  private resolvePublicUrl(objectKey: string, fallbackUrl?: string) {
    const apkBaseUrl = this.configService.get<string>('APK_PUBLIC_BASE_URL');
    const ossBaseUrl = this.configService.get<string>('OSS_PUBLIC_BASE_URL');
    const baseUrl = apkBaseUrl || ossBaseUrl;
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, '')}/${objectKey}`;
    }
    return fallbackUrl ?? objectKey;
  }

  private requireConfig(key: string) {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new BadRequestException(`${key} is not configured`);
    }
    return value;
  }
}
