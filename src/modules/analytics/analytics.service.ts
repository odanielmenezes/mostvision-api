import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { MetricsService } from '../../observability/metrics/metrics.service';
import { AnalyticsQueueService } from '../../queue/analytics.queue';
import { Client } from '../clients/entities/client.entity';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { AnalyticsEvent } from './entities/analytics-event.entity';

@Injectable()
export class AnalyticsService implements OnModuleInit {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsRepository: Repository<AnalyticsEvent>,
    private readonly analyticsQueueService: AnalyticsQueueService,
    private readonly logger: PinoLogger,
    private readonly metricsService: MetricsService,
  ) {}

  onModuleInit(): void {
    this.logger.setContext(AnalyticsService.name);
  }

  async createForClient(
    client: Client,
    createEventDto: CreateAnalyticsEventDto,
  ): Promise<AnalyticsEvent> {
    const event = this.analyticsRepository.create({
      clientId: client.id,
      eventType: createEventDto.eventType,
      payload: createEventDto.payload,
    });

    const savedEvent = await this.analyticsRepository.save(event);
    this.metricsService.increment('analytics.events.created');
    await this.analyticsQueueService.processAnalyticsEventJob({
      analyticsEventId: savedEvent.id,
      clientId: savedEvent.clientId,
      eventType: savedEvent.eventType,
    });

    this.logger.info({
      event: 'analytics.event.created',
      action: 'queued_for_processing',
      clientId: savedEvent.clientId,
      eventType: savedEvent.eventType,
      analyticsEventId: savedEvent.id,
      timestamp: new Date().toISOString(),
    });

    return savedEvent;
  }
}