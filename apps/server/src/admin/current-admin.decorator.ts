import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { RequestWithContext } from '../common/request-context';

export type CurrentAdmin = {
  adminUserId: bigint;
  username: string;
};

export const CurrentAdminUser = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentAdmin => {
  const request = context.switchToHttp().getRequest<RequestWithContext>();
  const adminUserId = request.user?.adminUserId;
  const username = request.user?.username;

  if (!adminUserId || !username) {
    throw new UnauthorizedException('请先登录后台');
  }

  return {
    adminUserId,
    username,
  };
});
