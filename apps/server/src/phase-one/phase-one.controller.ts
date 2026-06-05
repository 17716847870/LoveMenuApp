import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { PhaseOneService } from './phase-one.service';

@Controller('phase-one')
@UseGuards(JwtAuthGuard)
export class PhaseOneController {
  constructor(private readonly phaseOneService: PhaseOneService) {}

  @Get('bootstrap')
  async getBootstrap(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.phaseOneService.getBootstrap(userId));
  }

  @Get('home')
  async getHome(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.phaseOneService.getHome(userId));
  }
}
