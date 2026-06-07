import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';

import { dataResponse } from '../../common/api-response';
import { AdminAuthGuard } from '../admin-auth.guard';
import { AdminAuditLogsService } from './admin-audit-logs.service';

@Controller('admin/audit-logs')
@UseGuards(AdminAuthGuard)
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AdminAuditLogsService) {}

  @Get()
  async list(@Query() query: { action?: string; target_type?: string }) {
    return dataResponse(await this.auditLogsService.list(query));
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return dataResponse(await this.auditLogsService.get(BigInt(id)));
  }
}
