import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';

import { dataResponse } from '../../common/api-response';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuthGuard } from '../admin-auth.guard';
import { CurrentAdminUser, CurrentAdmin } from '../current-admin.decorator';
import { AdminDeploymentsService } from './admin-deployments.service';

@Controller('admin/deployments')
@UseGuards(AdminAuthGuard)
export class AdminDeploymentsController {
  constructor(private readonly deploymentsService: AdminDeploymentsService) {}

  @Post()
  async create(
    @Body() body: { branch?: string; target_commit?: string },
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.deploymentsService.create(body, admin, request));
  }

  @Get('refs')
  async refs(@Query() query: { branch?: string }) {
    return dataResponse(await this.deploymentsService.refs(query.branch));
  }

  @Get()
  async list() {
    return dataResponse(await this.deploymentsService.list());
  }

  @Get('current')
  async current() {
    return dataResponse(await this.deploymentsService.current());
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return dataResponse(await this.deploymentsService.get(BigInt(id)));
  }
}
