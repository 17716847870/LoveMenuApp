import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto) {
    const now = new Date();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        phone: dto.phone,
      },
    });

    if (existingUser) {
      const user = await this.prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          lastLoginAt: now,
        },
      });
      return this.createAuthResponse(user);
    }

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        nickname: `用户${dto.phone.slice(-4)}`,
        lastLoginAt: now,
      },
    });
    return this.createAuthResponse(user);
  }

  async register(dto: RegisterDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('phone or email is required');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.phone ?? undefined }, { email: dto.email ?? undefined }].filter((item) =>
          Object.values(item).some(Boolean),
        ),
      },
    });

    if (existingUser) {
      throw new ConflictException('user already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        nickname: dto.nickname,
        avatarUrl: dto.avatar_url,
        gender: dto.gender,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
        lastLoginAt: new Date(),
      },
    });
    return this.createAuthResponse(user);
  }

  async refreshSession(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('user unavailable');
    }

    return this.createAuthResponse(user);
  }

  private createAuthResponse(user: Awaited<ReturnType<PrismaService['user']['findUnique']>>) {
    if (!user) {
      throw new UnauthorizedException('user unavailable');
    }

    const { token, expiresAt } = this.tokenService.signUserToken(user.id);
    return {
      user,
      token,
      expiresAt,
    };
  }
}
