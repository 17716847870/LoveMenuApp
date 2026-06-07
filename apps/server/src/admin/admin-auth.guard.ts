import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { RequestWithContext } from '../common/request-context';
import { AdminTokenService } from './admin-token.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly tokenService: AdminTokenService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authorization = request.headers.authorization as string | undefined;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('请先登录后台');
    }

    request.user = {
      ...request.user,
      ...this.tokenService.verifyAdminToken(token),
    };
    return true;
  }
}
