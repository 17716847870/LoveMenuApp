import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { dataResponse } from '../../common/api-response';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuthGuard } from '../admin-auth.guard';
import { CurrentAdminUser, CurrentAdmin } from '../current-admin.decorator';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('login')
  async login(@Body() body: { username?: string; password?: string }, @Req() request: RequestWithContext) {
    return dataResponse(await this.authService.login(body, request));
  }

  @Get('session')
  @UseGuards(AdminAuthGuard)
  async session(@CurrentAdminUser() admin: CurrentAdmin) {
    return dataResponse(await this.authService.session(admin.adminUserId));
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  logout() {
    return dataResponse({ ok: true });
  }
}
