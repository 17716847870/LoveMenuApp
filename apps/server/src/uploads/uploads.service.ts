import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSS = require('ali-oss');
import { extname } from 'path';
import { randomUUID } from 'crypto';

import { UploadedImageFile } from './uploaded-file.type';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/aac',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'audio/3gpp',
]);

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  async uploadImage(file: UploadedImageFile, userId: bigint) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('only image files are supported');
    }

    const client = this.createOssClient();
    const objectKey = this.createObjectKey(file, userId);
    const result = await client.put(objectKey, file.buffer, {
      mime: file.mimetype,
      headers: {
        'Cache-Control': 'public, max-age=31536000',
      },
    });

    return {
      url: this.resolvePublicUrl(objectKey, result.url),
      objectKey,
    };
  }

  async createImageUploadSignature(payload: { file_name?: string; mime_type?: string }, userId: bigint) {
    const mimetype = payload.mime_type || 'image/jpeg';
    if (!ALLOWED_IMAGE_TYPES.has(mimetype)) {
      throw new BadRequestException('only image files are supported');
    }

    const client = this.createOssClient();
    const objectKey = this.createObjectKey(
      {
        originalname: payload.file_name || `lovemenu-${Date.now()}.jpg`,
        mimetype,
        buffer: Buffer.alloc(0),
      },
      userId,
    );
    const uploadExpiresIn = Number(this.configService.get<string>('OSS_UPLOAD_URL_EXPIRES_SECONDS') ?? 600);

    return {
      uploadUrl: client.signatureUrl(objectKey, {
        method: 'PUT',
        expires: uploadExpiresIn,
        'Content-Type': mimetype,
      }),
      url: this.signReadUrl(objectKey),
      objectKey,
      expiresAt: new Date(Date.now() + uploadExpiresIn * 1000),
    };
  }

  async createAudioUploadSignature(payload: { file_name?: string; mime_type?: string }, userId: bigint) {
    const mimetype = payload.mime_type || 'audio/mp4';
    if (!ALLOWED_AUDIO_TYPES.has(mimetype)) {
      throw new BadRequestException('only audio files are supported');
    }

    const client = this.createOssClient();
    const objectKey = this.createObjectKey(
      {
        originalname: payload.file_name || `lovemenu-voice-${Date.now()}.m4a`,
        mimetype,
        buffer: Buffer.alloc(0),
      },
      userId,
    );
    const uploadExpiresIn = Number(this.configService.get<string>('OSS_UPLOAD_URL_EXPIRES_SECONDS') ?? 600);

    return {
      uploadUrl: client.signatureUrl(objectKey, {
        method: 'PUT',
        expires: uploadExpiresIn,
        'Content-Type': mimetype,
      }),
      url: this.signReadUrl(objectKey),
      objectKey,
      expiresAt: new Date(Date.now() + uploadExpiresIn * 1000),
    };
  }

  signReadUrl(objectKeyOrUrl: string | null | undefined) {
    if (!objectKeyOrUrl) {
      return null;
    }

    if (/^https?:\/\//i.test(objectKeyOrUrl)) {
      return objectKeyOrUrl;
    }

    const client = this.createOssClient();
    const expires = Number(this.configService.get<string>('OSS_READ_URL_EXPIRES_SECONDS') ?? 3600);
    return client.signatureUrl(objectKeyOrUrl, {
      method: 'GET',
      expires,
    });
  }

  resolveObjectKey(value: string | null | undefined) {
    if (!value || /^https?:\/\//i.test(value)) {
      return null;
    }

    return value;
  }

  private createOssClient() {
    const region = this.requireConfig('OSS_REGION');
    const accessKeyId = this.requireConfig('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.requireConfig('OSS_ACCESS_KEY_SECRET');
    const bucket = this.requireConfig('OSS_BUCKET');

    return new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      secure: true,
    });
  }

  private createObjectKey(file: UploadedImageFile, userId: bigint) {
    const rawExt = extname(file.originalname).toLowerCase();
    const fallbackExt =
      file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : file.mimetype.startsWith('audio/')
            ? '.m4a'
            : '.jpg';
    const ext = rawExt || fallbackExt;
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `lovemenu/uploads/${yyyy}/${mm}/${dd}/u${userId.toString()}-${randomUUID()}${ext}`;
  }

  private resolvePublicUrl(objectKey: string, fallbackUrl?: string) {
    const publicBaseUrl = this.configService.get<string>('OSS_PUBLIC_BASE_URL');
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, '')}/${objectKey}`;
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
