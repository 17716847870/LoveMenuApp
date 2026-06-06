import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class UsersService {
  private readonly phoneChangeIdentityTokens = new Map<string, { userId: bigint; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly smsService: SmsService,
  ) {}

  getBootstrapData() {
    return {
      message: 'LoveMenu users module is ready.',
    };
  }

  async getUser(id: number | bigint) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: typeof id === 'bigint' ? id : BigInt(id),
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserResponse(user);
  }

  async updateUser(
    id: number | bigint,
    payload: Partial<{
      nickname: string;
      phone: string;
      email: string;
      avatar_url: string;
      gender: string | null;
      preferred_role: string | null;
    }>,
  ) {
    await this.getUser(id);

    const user = await this.prisma.user.update({
      where: {
        id: typeof id === 'bigint' ? id : BigInt(id),
      },
      data: {
        nickname: payload.nickname,
        phone: payload.phone,
        email: payload.email,
        avatarUrl: payload.avatar_url,
        gender: payload.gender,
        preferredRole: payload.preferred_role,
      },
    });
    return this.toUserResponse(user);
  }

  async checkNicknameAvailability(nickname: string, currentUserId?: bigint) {
    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      return { available: false };
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        nickname: cleanNickname,
      },
    });

    return {
      available: !existingUser || existingUser.id === currentUserId,
    };
  }

  async completeRegistrationProfile(
    id: number | bigint,
    payload: {
      nickname?: string;
      password?: string;
      avatar_url?: string | null;
      gender?: string | null;
    },
  ) {
    const userId = typeof id === 'bigint' ? id : BigInt(id);
    await this.getUser(userId);

    const nickname = payload.nickname?.trim();
    if (!nickname) {
      throw new ConflictException('请填写昵称');
    }

    const { available } = await this.checkNicknameAvailability(nickname, userId);
    if (!available) {
      throw new ConflictException('昵称已被使用');
    }

    if (!payload.password || !this.isValidPassword(payload.password)) {
      throw new ConflictException('密码至少 8 位，并且需要包含小写字母和数字');
    }
    if (payload.gender !== 'male' && payload.gender !== 'female') {
      throw new ConflictException('请选择性别');
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        nickname,
        passwordHash: payload.password ? this.hashPassword(payload.password) : undefined,
        avatarUrl: payload.avatar_url,
        gender: payload.gender,
        profileCompleted: true,
      },
    });
    return this.toUserResponse(user);
  }

  async changePassword(
    id: number | bigint,
    payload: {
      sms_code?: string;
      new_password?: string;
    },
  ) {
    const userId = typeof id === 'bigint' ? id : BigInt(id);
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.phone) {
      throw new ConflictException('当前账号未绑定手机号');
    }
    if (!payload.sms_code) {
      throw new ConflictException('请填写短信验证码');
    }

    await this.smsService.verifyCode(user.phone, payload.sms_code, 'reset_password');

    if (!payload.new_password || !this.isValidPassword(payload.new_password)) {
      throw new ConflictException('密码至少 8 位，并且需要包含小写字母和数字');
    }
    if (user.passwordHash && this.verifyPassword(payload.new_password, user.passwordHash)) {
      throw new ConflictException('新密码不能和原密码一样');
    }

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: this.hashPassword(payload.new_password),
      },
    });

    return { updated: true };
  }

  async verifyPhoneChangeIdentity(
    id: number | bigint,
    payload: {
      method?: 'sms' | 'password';
      sms_code?: string;
      password?: string;
    },
  ) {
    const userId = typeof id === 'bigint' ? id : BigInt(id);
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.phone) {
      throw new ConflictException('当前账号未绑定手机号');
    }

    if (payload.method === 'password') {
      if (!user.passwordHash || !payload.password || !this.verifyPassword(payload.password, user.passwordHash)) {
        throw new UnauthorizedException('登录密码不正确');
      }
    } else {
      if (!payload.sms_code) {
        throw new ConflictException('请填写短信验证码');
      }
      await this.smsService.verifyCode(user.phone, payload.sms_code, 'verify_bound_phone');
    }

    const token = randomUUID();
    this.phoneChangeIdentityTokens.set(token, {
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return {
      identity_token: token,
      expires_in_seconds: 10 * 60,
    };
  }

  async changePhone(
    id: number | bigint,
    payload: {
      identity_token?: string;
      new_phone?: string;
      new_phone_code?: string;
    },
  ) {
    const userId = typeof id === 'bigint' ? id : BigInt(id);
    const tokenRecord = payload.identity_token ? this.phoneChangeIdentityTokens.get(payload.identity_token) : null;
    if (!tokenRecord || tokenRecord.userId !== userId || tokenRecord.expiresAt < Date.now()) {
      throw new UnauthorizedException('身份验证已过期，请重新验证');
    }

    const newPhone = payload.new_phone?.trim();
    if (!newPhone || !/^1\d{10}$/.test(newPhone)) {
      throw new ConflictException('手机号格式不正确');
    }
    if (!payload.new_phone_code) {
      throw new ConflictException('请填写短信验证码');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.phone === newPhone) {
      throw new ConflictException('新手机号不能和当前手机号一样');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        phone: newPhone,
      },
    });
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('该手机号已被其他账号绑定');
    }

    await this.smsService.verifyCode(newPhone, payload.new_phone_code, 'bind_new_phone');

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        phone: newPhone,
      },
    });
    this.phoneChangeIdentityTokens.delete(payload.identity_token!);

    return this.toUserResponse(updatedUser);
  }

  async touchPresence(id: number | bigint) {
    const user = await this.prisma.user.update({
      where: {
        id: typeof id === 'bigint' ? id : BigInt(id),
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
    return this.toUserResponse(user);
  }

  async registerPushToken(
    userId: bigint,
    payload: {
      token?: string;
      platform?: string;
      deviceId?: string | null;
    },
  ) {
    const token = payload.token?.trim();
    if (!token || (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken['))) {
      return { registered: false };
    }

    await this.prisma.userPushToken.upsert({
      where: { token },
      update: {
        userId,
        platform: payload.platform,
        deviceId: payload.deviceId ?? null,
        status: 'active',
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        token,
        platform: payload.platform,
        deviceId: payload.deviceId ?? null,
      },
    });

    return { registered: true };
  }

  toUserResponse(user: Awaited<ReturnType<PrismaService['user']['findUnique']>>) {
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      ...user,
      avatarUrl: this.uploadsService.signReadUrl(user.avatarUrl),
      avatarObjectKey: this.uploadsService.resolveObjectKey(user.avatarUrl),
    };
  }

  private hashPassword(password: string) {
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

  private isValidPassword(password: string) {
    return password.length >= 8 && /[a-z]/.test(password) && /\d/.test(password);
  }
}
