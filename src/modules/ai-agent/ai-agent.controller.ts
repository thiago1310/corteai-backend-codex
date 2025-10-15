import { Body, Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { AskDto } from './dto/ask.dto';
import { TrainDto } from './dto/train.dto';
import { TenantSchema } from './decorators/tenant-schema.decorator';

@Controller('ai')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) { }

  @Post('ask')
  async ask(@Body() dto: AskDto, @TenantSchema() schema: string) {

    const response = await this.aiAgentService.ask(dto);
    return { schema, ...response };
  }

  @Post('train')
  async train(@Body() dto: TrainDto, @TenantSchema() schema: string) {
    const result = await this.aiAgentService.train(dto);
    return { schema, ...result };
  }

  @Get('history')
  async history(@Query('limit') limit = 20, @TenantSchema() schema: string) {
    const parsedLimit = Number(limit) || 20;
    const history = await this.aiAgentService.getHistory(parsedLimit);
    return { schema, history };
  }

  @Get('debug/schema')
  async debugSchema(@TenantSchema() schema: string) {
    const active = await this.aiAgentService.getActiveSchema();
    return { requested: schema, active };
  }
}
