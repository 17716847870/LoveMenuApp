import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { CoupleService } from './couple.service';
import { BindByInviteDto, ConfirmRelationshipRoleDto, CreateInviteDto, UpdateRelationshipRoleDto } from './dto';

@Controller('couple')
@UseGuards(JwtAuthGuard)
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Post('invites')
  async createInvite(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.coupleService.createInvite(userId));
  }

  @Post('bind')
  async bindByInvite(@Body() body: BindByInviteDto, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.coupleService.bindByInvite(body.invite_code, userId));
  }

  @Get('relationships/:id')
  async getRelationship(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.coupleService.getRelationship(id, userId));
  }

  @Patch('relationships/:id/role')
  async updateRelationshipRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRelationshipRoleDto,
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.coupleService.updateRelationshipRole(id, body, userId));
  }

  @Patch('relationships/:id/confirm-role')
  async confirmRelationshipRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ConfirmRelationshipRoleDto,
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.coupleService.confirmRelationshipRole(id, body, userId));
  }

  @Patch('relationships/:id/unbind')
  async unbindRelationship(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.coupleService.unbindRelationship(id, userId));
  }
}
