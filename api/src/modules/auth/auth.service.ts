import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import type { ApiUser } from '@/common/contract';
import { userSelect } from '@/common/user-select';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';
import { hashPassword, verifyPassword } from './password';
import { TokenService } from './token.service';

export interface AuthResult {
  user: ApiUser;
  accessToken: string;
}

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';

@Injectable()
export class AuthService implements OnModuleInit {
  /** Verified against when the e-mail is unknown, so both login failures cost about the same. */
  private dummyHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await hashPassword('senha-fantasma-para-equalizar-tempo');
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash: await hashPassword(dto.password) },
      select: userSelect,
    });
    return { user, accessToken: await this.tokens.sign(user.id) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const found = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...userSelect, passwordHash: true },
    });

    const valid = await verifyPassword(found?.passwordHash ?? this.dummyHash, dto.password);
    if (!found || !valid) throw new UnauthorizedException(INVALID_CREDENTIALS);

    const user: ApiUser = { id: found.id, name: found.name, email: found.email };
    return { user, accessToken: await this.tokens.sign(user.id) };
  }
}
