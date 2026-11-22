import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  TaskDto,
  TaskWithProjectDto,
  type ApiTask,
  type ApiTaskWithProject,
  type ApiUser,
} from '@/common/contract';
import { CurrentUser } from '@/common/decorators';
import { IdParamsDto } from '@/common/dto';
import { CreateTaskDto, MoveTaskDto, MyTasksQueryDto, UpdateTaskDto } from './dto/tasks.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tarefas')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('projects/:id/tasks')
  @ApiOperation({ summary: 'Listar as tarefas de um projeto, por coluna e posição' })
  @ApiOkResponse({ type: [TaskDto] })
  list(@CurrentUser() user: ApiUser, @Param() params: IdParamsDto): Promise<ApiTask[]> {
    return this.tasks.listByProject(params.id, user.id);
  }

  @Post('projects/:id/tasks')
  @ApiOperation({ summary: 'Criar uma tarefa no fim da coluna' })
  @ApiCreatedResponse({ type: TaskDto })
  create(
    @CurrentUser() user: ApiUser,
    @Param() params: IdParamsDto,
    @Body() dto: CreateTaskDto,
  ): Promise<ApiTask> {
    return this.tasks.create(params.id, user.id, dto);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Detalhar uma tarefa' })
  @ApiOkResponse({ type: TaskDto })
  getOne(@CurrentUser() user: ApiUser, @Param() params: IdParamsDto): Promise<ApiTask> {
    return this.tasks.getOne(params.id, user.id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Atualizar os dados de uma tarefa' })
  @ApiOkResponse({ type: TaskDto })
  update(
    @CurrentUser() user: ApiUser,
    @Param() params: IdParamsDto,
    @Body() dto: UpdateTaskDto,
  ): Promise<ApiTask> {
    return this.tasks.update(params.id, user.id, dto);
  }

  @Patch('tasks/:id/move')
  @ApiOperation({ summary: 'Mover uma tarefa de coluna ou posição' })
  @ApiOkResponse({ type: [TaskDto], description: 'Todas as tarefas do projeto, já reordenadas' })
  move(
    @CurrentUser() user: ApiUser,
    @Param() params: IdParamsDto,
    @Body() dto: MoveTaskDto,
  ): Promise<ApiTask[]> {
    return this.tasks.move(params.id, user.id, dto);
  }

  @Delete('tasks/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir uma tarefa (dono do projeto ou quem a criou)' })
  @ApiNoContentResponse()
  remove(@CurrentUser() user: ApiUser, @Param() params: IdParamsDto): Promise<void> {
    return this.tasks.remove(params.id, user.id);
  }

  @Get('me/tasks')
  @ApiOperation({ summary: 'Listar as tarefas atribuídas a mim' })
  @ApiOkResponse({ type: [TaskWithProjectDto] })
  mine(
    @CurrentUser() user: ApiUser,
    @Query() query: MyTasksQueryDto,
  ): Promise<ApiTaskWithProject[]> {
    return this.tasks.listAssignedTo(user.id, query.status);
  }
}
