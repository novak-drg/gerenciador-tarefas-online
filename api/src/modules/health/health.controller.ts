import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators';

@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Verificar se a API está no ar' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
