import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ClientsModule } from '../modules/clients/clients.module';
import { EmailModule } from '../modules/email/email.module';
import { LeadsModule } from '../modules/leads/leads.module';
import { AnalyticsWorker } from '../workers/analytics.worker';
import { EmailWorker } from '../workers/email.worker';
import { LeadProcessingWorker } from '../workers/lead-processing.worker';
import { WebhookWorker } from '../workers/webhook.worker';
import { AnalyticsQueueService } from './analytics.queue';
import { EmailQueueService } from './email.queue';
import { LeadProcessingQueueService } from './lead-processing.queue';
import {
  ANALYTICS_QUEUE,
  EMAIL_QUEUE,
  LEAD_PROCESSING_QUEUE,
  WEBHOOK_QUEUE,
} from './queue.constants';
import { WebhookQueueService } from './webhook.queue';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),
    BullModule.registerQueue(
      { name: EMAIL_QUEUE },
      { name: WEBHOOK_QUEUE },
      { name: ANALYTICS_QUEUE },
      { name: LEAD_PROCESSING_QUEUE },
    ),
    ClientsModule,
    LeadsModule,
    EmailModule,
  ],
  providers: [
    EmailQueueService,
    WebhookQueueService,
    AnalyticsQueueService,
    LeadProcessingQueueService,
    EmailWorker,
    WebhookWorker,
    AnalyticsWorker,
    LeadProcessingWorker,
  ],
  exports: [
    EmailQueueService,
    WebhookQueueService,
    AnalyticsQueueService,
    LeadProcessingQueueService,
  ],
})
export class QueueModule {}