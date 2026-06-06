import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { TokenService } from './token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('请先登录');
    }

    request.user = this.tokenService.verifyUserToken(token);
    return true;
  }
}
