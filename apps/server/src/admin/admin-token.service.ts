import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type AdminJwtPayload = {
  sub: string;
  username: string;
  iat: number;
  exp: number;
};

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

@Injectable()
export class AdminTokenService {
  constructor(private readonly configService: ConfigService) {}

  signAdminToken(admin: { id: bigint; username: string }) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.getTtlSeconds();
    const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
    const payload = base64UrlJson({
      sub: admin.id.toString(),
      username: admin.username,
      iat: now,
      exp: expiresAt,
    });
    const signature = this.sign(`${header}.${payload}`);

    return {
      token: `${header}.${payload}.${signature}`,
      expiresAt: new Date(expiresAt * 1000),
    };
  }

  verifyAdminToken(token: string) {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      throw new UnauthorizedException('后台登录状态无效');
    }

    const expectedSignature = this.sign(`${header}.${payload}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      throw new UnauthorizedException('后台登录状态无效');
    }

    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminJwtPayload;
    if (!decodedPayload.sub || !decodedPayload.exp || decodedPayload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('后台登录已过期');
    }

    return {
      adminUserId: BigInt(decodedPayload.sub),
      username: decodedPayload.username,
    };
  }

  private sign(value: string) {
    return createHmac('sha256', this.getSecret()).update(value).digest('base64url');
  }

  private getSecret() {
    return this.configService.get<string>('ADMIN_JWT_SECRET') ?? 'lovemenu-admin-local-dev-secret';
  }

  private getTtlSeconds() {
    const value = this.configService.get<string>('ADMIN_JWT_EXPIRES_IN') ?? '12h';
    const match = value.match(/^(\d+)([smhd])?$/);
    if (!match) {
      return 12 * 60 * 60;
    }

    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };
    return amount * multipliers[unit as keyof typeof multipliers];
  }
}
