import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  MemberDto,
  ProjectDto,
  ProjectSummaryDto,
  type ApiMember,
  type ApiProject,
  type ApiProjectSummary,
  type ApiUser,
} from '@/common/contract';
import { CurrentUser } from '@/common/decorators';
import { IdParamsDto } from '@/common/dto';
import {
  AddMemberDto,
  CreateProjectDto,
  MemberParamsDto,
  UpdateProjectDto,
} from './dto/projects.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projetos')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar os projetos de que participo' })
  @ApiOkResponse({ type: [ProjectSummaryDto] })
  list(@CurrentUser() user: ApiUser): Promise<ApiProjectSummary[]> {
    return this.projects.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar um projeto (quem cria vira dono)' })
  @ApiCreatedResponse({ type: ProjectDto })
  create(@CurrentUser() user: ApiUser, @Body() dto: CreateProjectDto): Promise<ApiProject> {
    return this.projects.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar um projeto' })
  @ApiOkResponse({ type: ProjectDto })
  getOne(@CurrentUser() user: ApiUser, @Param() params: IdParamsDto): Promise<ApiProject> {
    return this.projects.getOne(params.id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um projeto (somente o dono)' })
  @ApiOkResponse({ type: ProjectDto })
  update(
    @CurrentUser() user: ApiUser,
    @Param() params: IdParamsDto,
    @Body() dto: UpdateProjectDto,
  ): Promise<ApiProject> {
    return this.projects.update(params.id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir um projeto com suas tarefas (somente o dono)' })
  @ApiNoContentResponse()
  remove(@CurrentUser() user: ApiUser, @Param() params: IdParamsDto): Promise<void> {
    return this.projects.remove(params.id, user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Adicionar um membro ao projeto (somente o dono)' })
  @ApiCreatedResponse({ type: MemberDto })
  addMember(
    @CurrentUser() user: ApiUser,
    @Param() params: IdParamsDto,
    @Body() dto: AddMemberDto,
  ): Promise<ApiMember> {
    return this.projects.addMember(params.id, user.id, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover um membro do projeto (somente o dono)' })
  @ApiNoContentResponse()
  removeMember(@CurrentUser() user: ApiUser, @Param() params: MemberParamsDto): Promise<void> {
    return this.projects.removeMember(params.id, user.id, params.userId);
  }
}
