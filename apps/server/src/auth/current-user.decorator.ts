import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  const userId = request.user?.userId as bigint | undefined;

  if (!userId) {
    throw new UnauthorizedException('missing user');
  }

  return userId;
});
