import { Controller, Delete, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';

import { dataResponse } from '../../common/api-response';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuthGuard } from '../admin-auth.guard';
import { CurrentAdminUser, CurrentAdmin } from '../current-admin.decorator';
import { AdminApiErrorLogsService } from './admin-api-error-logs.service';

@Controller('admin/api-error-logs')
@UseGuards(AdminAuthGuard)
export class AdminApiErrorLogsController {
  constructor(private readonly logsService: AdminApiErrorLogsService) {}

  @Get()
  async list(@Query() query: { path?: string; status_code?: string; error_name?: string; resolved?: string }) {
    return dataResponse(await this.logsService.list(query));
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return dataResponse(await this.logsService.get(BigInt(id)));
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.logsService.resolve(BigInt(id), admin, request));
  }

  @Delete('resolved')
  async deleteResolved() {
    return dataResponse(await this.logsService.deleteResolved());
  }

  @Delete('expired')
  async deleteExpired() {
    return dataResponse(await this.logsService.deleteExpired());
  }
}
