import { randomUUID } from 'crypto';

export type RequestWithContext = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
  query?: unknown;
  body?: unknown;
  ip?: string;
  requestId?: string;
  user?: {
    userId?: bigint;
    adminUserId?: bigint;
    username?: string;
  };
};

export function requestIdMiddleware(
  request: RequestWithContext,
  response: { setHeader: (key: string, value: string) => void },
  next: () => void,
) {
  const headerValue = request.headers['x-request-id'];
  const requestId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  request.requestId = requestId || randomUUID();
  response.setHeader('x-request-id', request.requestId);
  next();
}

export function getHeaderValue(request: RequestWithContext | undefined, key: string) {
  const value = request?.headers[key.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
