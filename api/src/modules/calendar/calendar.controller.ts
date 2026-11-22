import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { CalendarEventDto, type ApiCalendarEvent, type ApiUser } from '@/common/contract';
import { CurrentUser } from '@/common/decorators';
import { CalendarService } from './calendar.service';
import { CalendarQueryDto } from './dto/calendar.dto';

@ApiTags('Calendário')
@ApiBearerAuth()
@Controller()
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('calendar')
  @ApiOperation({ summary: 'Prazos de tarefas e projetos em um intervalo (máximo 92 dias)' })
  @ApiOkResponse({ type: [CalendarEventDto] })
  events(
    @CurrentUser() user: ApiUser,
    @Query() query: CalendarQueryDto,
  ): Promise<ApiCalendarEvent[]> {
    return this.calendar.events(user.id, query);
  }

  @Get('calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="tarefas.ics"')
  @ApiOperation({ summary: 'Exportar os prazos em formato iCalendar (.ics)' })
  @ApiProduces('text/calendar')
  @ApiOkResponse({ description: 'Arquivo iCalendar', schema: { type: 'string' } })
  ics(@CurrentUser() user: ApiUser): Promise<string> {
    return this.calendar.ics(user.id);
  }
}
