import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { WheelService } from './wheel.service';

@Controller('wheel')
@UseGuards(JwtAuthGuard)
export class WheelController {
  constructor(private readonly wheelService: WheelService) {}

  @Get('options')
  async listOptions(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.wheelService.listOptions(userId));
  }

  @Post('options')
  async createOption(@Body() body: Parameters<WheelService['createOption']>[0], @CurrentUserId() userId: bigint) {
    return dataResponse(await this.wheelService.createOption(body, userId));
  }

  @Delete('options/:id')
  async deleteOption(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.wheelService.deleteOption(id, userId));
  }

  @Post('spin')
  async spin(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.wheelService.spin(userId));
  }
}
