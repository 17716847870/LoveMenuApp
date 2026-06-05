import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
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
      throw new NotFoundException('user not found');
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
      throw new NotFoundException('user not found');
    }

    return {
      ...user,
      avatarUrl: this.uploadsService.signReadUrl(user.avatarUrl),
      avatarObjectKey: this.uploadsService.resolveObjectKey(user.avatarUrl),
    };
  }
}
