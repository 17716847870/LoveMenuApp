import { Body, Controller, Get, Post } from '@nestjs/common';

import { dataResponse } from '../common/api-response';
import { AppInfoService } from './app-info.service';

@Controller('app-info')
export class AppInfoController {
  constructor(private readonly appInfoService: AppInfoService) {}

  @Get('about')
  async getAbout() {
    return dataResponse(await this.appInfoService.getAbout());
  }

  @Post('version/check')
  async checkVersion(
    @Body()
    body: {
      platform?: 'ios' | 'android' | 'web';
      current_version?: string;
      build_number?: string;
    },
  ) {
    return dataResponse(await this.appInfoService.checkVersion(body));
  }
}
