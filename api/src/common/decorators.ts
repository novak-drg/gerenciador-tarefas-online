import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiUser } from '@/common/contract';

export const IS_PUBLIC_KEY = 'isPublic';
export const AUTH_RATE_LIMIT_KEY = 'authRateLimit';

export type AuthenticatedRequest = Request & { user: ApiUser };

/** Skips the global authentication guard. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/** Opts a route into the strict per-IP limit used by login and register. */
export const AuthRateLimit = (): MethodDecorator & ClassDecorator =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
