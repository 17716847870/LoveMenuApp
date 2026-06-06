import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { scryptSync, timingSafeEqual } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { CodeLoginDto, LoginDto, PasswordLoginDto, RegisterDto } from './dto';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly smsService: SmsService,
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
        nickname: await this.createDefaultNickname(dto.phone),
        lastLoginAt: now,
      },
    });
    return this.createAuthResponse(user);
  }

  async loginWithCode(dto: CodeLoginDto) {
    await this.smsService.verifyCode(dto.phone, dto.code, 'login');
    const existingUser = await this.prisma.user.findUnique({
      where: {
        phone: dto.phone,
      },
    });

    if (!existingUser) {
      const user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          nickname: await this.createDefaultNickname(dto.phone),
          profileCompleted: false,
          lastLoginAt: new Date(),
        },
      });
      return this.createAuthResponse(user);
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
    return this.createAuthResponse(updatedUser);
  }

  async loginWithPassword(dto: PasswordLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        phone: dto.phone,
      },
    });

    if (!user?.passwordHash || !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('手机号或密码不正确');
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
    return this.createAuthResponse(updatedUser);
  }

  async register(dto: RegisterDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('请填写手机号或邮箱');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.phone ?? undefined }, { email: dto.email ?? undefined }].filter((item) =>
          Object.values(item).some(Boolean),
        ),
      },
    });

    if (existingUser) {
      throw new ConflictException('用户已存在');
    }

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        nickname: dto.nickname,
        avatarUrl: dto.avatar_url,
        gender: dto.gender,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
        profileCompleted: true,
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
      throw new UnauthorizedException('账号不可用');
    }

    return this.createAuthResponse(user);
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

  private async createDefaultNickname(phone: string) {
    const baseName = `用户${phone.slice(-4)}`;
    const existingCount = await this.prisma.user.count({
      where: {
        nickname: {
          startsWith: baseName,
        },
      },
    });
    return existingCount > 0 ? `${baseName}${existingCount + 1}` : baseName;
  }

  private createAuthResponse(user: Awaited<ReturnType<PrismaService['user']['findUnique']>>) {
    if (!user) {
      throw new UnauthorizedException('账号不可用');
    }

    const { token, expiresAt } = this.tokenService.signUserToken(user.id);
    return {
      user,
      token,
      expiresAt,
    };
  }
}
