import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
};

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlJson(value: unknown) {
  return base64UrlEncode(JSON.stringify(value));
}

@Injectable()
export class TokenService {
  constructor(private readonly configService: ConfigService) {}

  signUserToken(userId: bigint) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + TOKEN_TTL_SECONDS;
    const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
    const payload = base64UrlJson({ sub: userId.toString(), iat: now, exp: expiresAt });
    const signature = this.sign(`${header}.${payload}`);

    return {
      token: `${header}.${payload}.${signature}`,
      expiresAt: new Date(expiresAt * 1000),
    };
  }

  verifyUserToken(token: string) {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      throw new UnauthorizedException('登录状态无效，请重新登录');
    }

    const expectedSignature = this.sign(`${header}.${payload}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      throw new UnauthorizedException('登录状态无效，请重新登录');
    }

    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtPayload;
    if (!decodedPayload.sub || !decodedPayload.exp || decodedPayload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }

    return {
      userId: BigInt(decodedPayload.sub),
    };
  }

  private sign(value: string) {
    return createHmac('sha256', this.getSecret()).update(value).digest('base64url');
  }

  private getSecret() {
    return this.configService.get<string>('JWT_SECRET') ?? 'lovemenu-local-dev-secret';
  }
}
