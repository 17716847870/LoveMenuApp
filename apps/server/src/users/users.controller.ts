import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('bootstrap')
  getBootstrapData() {
    return this.usersService.getBootstrapData();
  }

  @Get('me')
  async getMe(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.usersService.getUser(userId));
  }

  @Patch('me')
  async updateMe(
    @CurrentUserId() userId: bigint,
    @Body()
    body: Partial<{
      nickname: string;
      phone: string;
      email: string;
      avatar_url: string;
      gender: string | null;
      preferred_role: string | null;
    }>,
  ) {
    return dataResponse(await this.usersService.updateUser(userId, body));
  }

  @Patch('presence')
  async touchPresence(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.usersService.touchPresence(userId));
  }

  @Patch('push-token')
  async registerPushToken(
    @CurrentUserId() userId: bigint,
    @Body()
    body: {
      token?: string;
      platform?: string;
      deviceId?: string | null;
    },
  ) {
    return dataResponse(await this.usersService.registerPushToken(userId, body));
  }
}
