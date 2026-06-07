import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import { AdminTokenService } from '../admin-token.service';
import { AdminAuditService } from '../audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithContext } from '../../common/request-context';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: AdminTokenService,
    private readonly auditService: AdminAuditService,
  ) {}

  async login(dto: { username?: string; password?: string }, request: RequestWithContext) {
    const username = dto.username?.trim();
    const password = dto.password ?? '';
    const admin = username
      ? await this.prisma.adminUser.findUnique({
          where: { username },
        })
      : null;

    if (!admin || admin.status !== 'active' || !this.verifyPassword(password, admin.passwordHash)) {
      await this.auditService.write({
        adminUsername: username,
        action: 'admin.login_failed',
        targetType: 'admin_user',
        summary: `后台登录失败：${username || 'unknown'}`,
        request,
      });
      throw new UnauthorizedException('用户名或密码不正确');
    }

    const updatedAdmin = await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    const token = this.tokenService.signAdminToken(updatedAdmin);

    await this.auditService.write({
      adminUserId: updatedAdmin.id,
      adminUsername: updatedAdmin.username,
      action: 'admin.login_success',
      targetType: 'admin_user',
      targetId: updatedAdmin.id,
      summary: `后台登录成功：${updatedAdmin.username}`,
      request,
    });

    return {
      admin: this.toAdminResponse(updatedAdmin),
      ...token,
    };
  }

  async session(adminUserId: bigint) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('后台账号不可用');
    }

    return this.toAdminResponse(admin);
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, passwordHash: string) {
    const [salt, storedHash] = passwordHash.split(':');
    if (!salt || !storedHash) {
      return false;
    }

    const candidate = Buffer.from(scryptSync(password, salt, 64).toString('hex'), 'hex');
    const expected = Buffer.from(storedHash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }

  private toAdminResponse(admin: {
    id: bigint;
    username: string;
    displayName: string | null;
    lastLoginAt: Date | null;
  }) {
    return {
      id: admin.id,
      username: admin.username,
      displayName: admin.displayName,
      lastLoginAt: admin.lastLoginAt,
    };
  }
}
