import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserDto, type ApiUser } from '@/common/contract';
import { SearchUsersDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Usuários')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar usuários por nome ou e-mail (até 10 resultados)' })
  @ApiOkResponse({ type: [UserDto] })
  search(@Query() query: SearchUsersDto): Promise<ApiUser[]> {
    return this.users.search(query.search);
  }
}
