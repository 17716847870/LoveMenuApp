import { Controller, Get, UseGuards } from '@nestjs/common';

import { dataResponse } from '../../common/api-response';
import { AdminAuthGuard } from '../admin-auth.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(AdminAuthGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  async overview() {
    return dataResponse(await this.dashboardService.overview());
  }
}
