import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env';
import { ENV } from '@/config/env.module';
import { signAccessToken, verifyAccessToken } from './token';

@Injectable()
export class TokenService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  sign(userId: string): Promise<string> {
    return signAccessToken(userId, this.env.JWT_SECRET, this.env.JWT_EXPIRES_IN);
  }

  verify(token: string): Promise<string | null> {
    return verifyAccessToken(token, this.env.JWT_SECRET);
  }
}
