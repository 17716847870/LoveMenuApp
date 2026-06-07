import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { dataResponse } from '../../common/api-response';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuthGuard } from '../admin-auth.guard';
import { CurrentAdminUser, CurrentAdmin } from '../current-admin.decorator';
import { AdminAppReleasesService } from './admin-app-releases.service';

@Controller('admin/app-releases')
@UseGuards(AdminAuthGuard)
export class AdminAppReleasesController {
  constructor(private readonly releasesService: AdminAppReleasesService) {}

  @Get()
  async list(@Query() query: { platform?: string; status?: string }) {
    return dataResponse(await this.releasesService.list(query));
  }

  @Post()
  async create(
    @Body() body: Record<string, unknown>,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.releasesService.create(body, admin, request));
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return dataResponse(await this.releasesService.get(BigInt(id)));
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.releasesService.update(BigInt(id), body, admin, request));
  }

  @Post(':id/activate')
  async activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.releasesService.activate(BigInt(id), admin, request));
  }

  @Post(':id/deactivate')
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.releasesService.deactivate(BigInt(id), admin, request));
  }

  @Post(':id/archive')
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.releasesService.archive(BigInt(id), admin, request));
  }

  @Post('upload-apk')
  @UseInterceptors(FileInterceptor('file'))
  async uploadApk(
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @CurrentAdminUser() admin: CurrentAdmin,
    @Req() request: RequestWithContext,
  ) {
    return dataResponse(await this.releasesService.uploadApk(file, admin, request));
  }
}
