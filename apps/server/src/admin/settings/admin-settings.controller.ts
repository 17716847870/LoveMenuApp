import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';

import { dataResponse } from '../../common/api-response';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuthGuard } from '../admin-auth.guard';
import { CurrentAdminUser, CurrentAdmin } from '../current-admin.decorator';
import { AdminSettingsService, DeploymentSettings } from './admin-settings.service';

@Controller('admin/settings')
@UseGuards(AdminAuthGuard)
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get('deployment')
  async getDeploymentSettings() {
    return dataResponse(await this.settingsService.getDeploymentSettings());
  }

  @Get('env-check')
  envCheck() {
    return dataResponse(this.settingsService.envCheck());
  }

  @Put('deployment')
  async updateDeploymentSettings(
    @Body() body: Partial<DeploymentSettings>,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.settingsService.updateDeploymentSettings(body, admin, request));
  }
}
