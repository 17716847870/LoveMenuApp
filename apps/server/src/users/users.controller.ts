import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';

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

  @Get('nickname-availability')
  async checkNickname(@CurrentUserId() userId: bigint, @Query('nickname') nickname = '') {
    return dataResponse(await this.usersService.checkNicknameAvailability(nickname, userId));
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

  @Patch('me/registration-profile')
  async completeRegistrationProfile(
    @CurrentUserId() userId: bigint,
    @Body()
    body: {
      nickname?: string;
      password?: string;
      avatar_url?: string | null;
      gender?: string | null;
    },
  ) {
    return dataResponse(await this.usersService.completeRegistrationProfile(userId, body));
  }

  @Patch('me/password')
  async changePassword(
    @CurrentUserId() userId: bigint,
    @Body()
    body: {
      sms_code?: string;
      new_password?: string;
    },
  ) {
    return dataResponse(await this.usersService.changePassword(userId, body));
  }

  @Patch('me/phone/identity')
  async verifyPhoneChangeIdentity(
    @CurrentUserId() userId: bigint,
    @Body()
    body: {
      method?: 'sms' | 'password';
      sms_code?: string;
      password?: string;
    },
  ) {
    return dataResponse(await this.usersService.verifyPhoneChangeIdentity(userId, body));
  }

  @Patch('me/phone')
  async changePhone(
    @CurrentUserId() userId: bigint,
    @Body()
    body: {
      identity_token?: string;
      new_phone?: string;
      new_phone_code?: string;
    },
  ) {
    return dataResponse(await this.usersService.changePhone(userId, body));
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
