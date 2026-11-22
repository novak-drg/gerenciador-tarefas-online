import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardSummaryDto, type ApiDashboardSummary, type ApiUser } from '@/common/contract';
import { CurrentUser } from '@/common/decorators';
import { DashboardService } from './dashboard.service';

@ApiTags('Painel')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo do painel: projetos, tarefas em aberto, atrasadas e próximas' })
  @ApiOkResponse({ type: DashboardSummaryDto })
  summary(@CurrentUser() user: ApiUser): Promise<ApiDashboardSummary> {
    return this.dashboard.summary(user.id);
  }
}
