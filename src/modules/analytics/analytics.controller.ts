import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-keys.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { AnalyticsService } from './analytics.service';

@Controller({
  path: 'events',
  version: '1',
})
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(
    @Body() createAnalyticsEventDto: CreateAnalyticsEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.client) {
      throw new UnauthorizedException('Client not resolved for API key');
    }

    return this.analyticsService.createForClient(request.client, createAnalyticsEventDto);
  }
}