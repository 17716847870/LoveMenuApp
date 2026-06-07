import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';

import { dataResponse } from '../../common/api-response';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuthGuard } from '../admin-auth.guard';
import { CurrentAdminUser, CurrentAdmin } from '../current-admin.decorator';
import { AdminAppInfoService } from './admin-app-info.service';

@Controller('admin/app-info')
@UseGuards(AdminAuthGuard)
export class AdminAppInfoController {
  constructor(private readonly appInfoService: AdminAppInfoService) {}

  @Get('about')
  async getAbout() {
    return dataResponse(await this.appInfoService.getAbout());
  }

  @Put('about')
  async updateAbout(
    @Body() body: Record<string, unknown>,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.appInfoService.updateAbout(body, admin, request));
  }
}
