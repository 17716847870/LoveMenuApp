import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { dataResponse } from '../common/api-response';
import { AuthService } from './auth.service';
import { CurrentUserId } from './current-user.decorator';
import { CodeLoginDto, LoginDto, PasswordLoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return dataResponse(await this.authService.login(body));
  }

  @Post('login/code')
  async loginWithCode(@Body() body: CodeLoginDto) {
    return dataResponse(await this.authService.loginWithCode(body));
  }

  @Post('login/password')
  async loginWithPassword(@Body() body: PasswordLoginDto) {
    return dataResponse(await this.authService.loginWithPassword(body));
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return dataResponse(await this.authService.register(body));
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async session(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.authService.refreshSession(userId));
  }
}
