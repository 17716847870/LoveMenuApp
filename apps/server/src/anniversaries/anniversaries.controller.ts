import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { AnniversariesService } from './anniversaries.service';

@Controller('anniversaries')
@UseGuards(JwtAuthGuard)
export class AnniversariesController {
  constructor(private readonly anniversariesService: AnniversariesService) {}

  @Get()
  async list(@CurrentUserId() viewerUserId: bigint) {
    return dataResponse(await this.anniversariesService.listForUser(viewerUserId));
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number, @CurrentUserId() viewerUserId: bigint) {
    return dataResponse(await this.anniversariesService.get(id, viewerUserId));
  }

  @Post()
  async create(@Body() body: Parameters<AnniversariesService['create']>[0], @CurrentUserId() userId: bigint) {
    return dataResponse(await this.anniversariesService.create(body, userId));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Parameters<AnniversariesService['update']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.anniversariesService.update(id, body, userId));
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.anniversariesService.delete(id, userId));
  }
}
