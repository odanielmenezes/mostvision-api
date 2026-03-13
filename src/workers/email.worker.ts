import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  LEAD_CREATED_DLQ,
  LEAD_CREATED_DLQ_ROUTING_KEY,
  LEAD_CREATED_QUEUE,
  LEAD_CREATED_RETRY_DELAYS_MS,
  LEAD_CREATED_RETRY_QUEUE,
  LEAD_CREATED_RETRY_ROUTING_KEY,
  LEAD_CREATED_ROUTING_KEY,
} from '../common/rabbitmq/rabbitmq.constants';
import { RabbitMQService } from '../common/rabbitmq/rabbitmq.service';
import { LeadCreatedEvent } from '../events/lead-created.event';
import { MetricsService } from '../observability/metrics/metrics.service';
import { ClientsService } from '../modules/clients/clients.service';
import { EmailService } from '../modules/email/email.service';
import { LeadsService } from '../modules/leads/leads.service';

@Injectable()
export class EmailWorker implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly clientsService: ClientsService,
    private readonly leadsService: LeadsService,
    private readonly emailService: EmailService,
    private readonly logger: PinoLogger,
    private readonly metricsService: MetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.setContext(EmailWorker.name);

    await this.rabbitMQService.consumeWithRetry({
      queue: LEAD_CREATED_QUEUE,
      routingKey: LEAD_CREATED_ROUTING_KEY,
      retryQueue: LEAD_CREATED_RETRY_QUEUE,
      retryRoutingKey: LEAD_CREATED_RETRY_ROUTING_KEY,
      deadLetterQueue: LEAD_CREATED_DLQ,
      deadLetterRoutingKey: LEAD_CREATED_DLQ_ROUTING_KEY,
      retryDelaysMs: LEAD_CREATED_RETRY_DELAYS_MS,
      handler: async (payload) => {
        await this.handleLeadCreated(payload as LeadCreatedEvent);
      },
    });

    this.logger.info({
      event: 'lead.created',
      action: 'worker_listening',
      queue: LEAD_CREATED_QUEUE,
      retryQueue: LEAD_CREATED_RETRY_QUEUE,
      dlq: LEAD_CREATED_DLQ,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleLeadCreated(payload: LeadCreatedEvent): Promise<void> {
    const lead = await this.leadsService.findOne(payload.leadId);
    const client = await this.clientsService.findOne(lead.clientId);

    await this.emailService.sendLeadCreatedNotification(
      client.name,
      client.emailReceiver,
      lead,
    );

    this.metricsService.increment('workers.email.processed');

    this.logger.info({
      event: 'lead.created',
      action: 'worker_processed',
      clientId: client.id,
      leadId: lead.id,
      timestamp: new Date().toISOString(),
    });
  }
}