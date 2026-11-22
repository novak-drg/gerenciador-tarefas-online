import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, type AuthenticatedRequest } from '@/common/decorators';
import { userSelect } from '@/common/user-select';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TokenService } from '@/modules/auth/token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Não autenticado');

    const userId = await this.tokens.verify(token);
    if (!userId) throw new UnauthorizedException('Não autenticado');

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw new UnauthorizedException('Não autenticado');

    request.user = user;
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) return null;
  return token;
}
