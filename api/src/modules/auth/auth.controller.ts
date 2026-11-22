import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthResultDto, ErrorResponseDto, UserDto, type ApiUser } from '@/common/contract';
import { AuthRateLimit, CurrentUser, Public } from '@/common/decorators';
import { AuthService, type AuthResult } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @AuthRateLimit()
  @Post('register')
  @ApiOperation({ summary: 'Cadastrar um novo usuário' })
  @ApiCreatedResponse({ type: AuthResultDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'E-mail já cadastrado' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto);
  }

  @Public()
  @AuthRateLimit()
  @HttpCode(200)
  @Post('login')
  @ApiOperation({ summary: 'Entrar com e-mail e senha' })
  @ApiOkResponse({ type: AuthResultDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'E-mail ou senha inválidos' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  @ApiOkResponse({ type: UserDto })
  me(@CurrentUser() user: ApiUser): ApiUser {
    return user;
  }
}
