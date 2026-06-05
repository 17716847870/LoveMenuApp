import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { SpaceService } from './space.service';

@Controller('space')
@UseGuards(JwtAuthGuard)
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  @Get('posts')
  async listPosts(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.spaceService.listPosts(userId));
  }

  @Get('stats')
  async getStats(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.spaceService.getStats(userId));
  }

  @Post('posts')
  async createDailyPost(@Body() body: Parameters<SpaceService['createDailyPost']>[0], @CurrentUserId() userId: bigint) {
    return dataResponse(await this.spaceService.createDailyPost(body, userId));
  }
}
