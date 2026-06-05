import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('settings')
  async getSettings(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.notificationsService.getSettings(userId));
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUserId() userId: bigint,
    @Body()
    body: Partial<{
      chatMessages: boolean;
      menuApplications: boolean;
      anniversaryReminders: boolean;
      periodReminders: boolean;
      quietHours: boolean;
    }>,
  ) {
    return dataResponse(await this.notificationsService.updateSettings(userId, body));
  }
}
