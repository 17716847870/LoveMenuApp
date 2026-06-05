import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { MenuRequestsService } from './menu-requests.service';

@Controller('menu-requests')
@UseGuards(JwtAuthGuard)
export class MenuRequestsController {
  constructor(private readonly menuRequestsService: MenuRequestsService) {}

  @Get()
  async listMenuRequests(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.menuRequestsService.listForUser(userId));
  }

  @Get(':id')
  async getMenuRequest(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.menuRequestsService.get(id, userId));
  }

  @Post()
  async createMenuRequest(@Body() body: Parameters<MenuRequestsService['create']>[0], @CurrentUserId() userId: bigint) {
    return dataResponse(await this.menuRequestsService.create(body, userId));
  }

  @Patch(':id/status')
  async updateMenuRequestStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Parameters<MenuRequestsService['updateStatus']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.menuRequestsService.updateStatus(id, body, userId));
  }
}
