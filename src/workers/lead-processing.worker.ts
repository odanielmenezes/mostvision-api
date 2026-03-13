import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { EmailQueueService } from '../queue/email.queue';
import {
  LEAD_PROCESSING_JOB_PROCESS,
  LEAD_PROCESSING_QUEUE,
} from '../queue/queue.constants';
import { WebhookQueueService } from '../queue/webhook.queue';

@Injectable()
@Processor(LEAD_PROCESSING_QUEUE)
export class LeadProcessingWorker extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly emailQueueService: EmailQueueService,
    private readonly webhookQueueService: WebhookQueueService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.setContext(LeadProcessingWorker.name);

    if (job.name !== LEAD_PROCESSING_JOB_PROCESS) {
      this.logger.warn({
        event: 'lead.processing.unknown_job',
        jobName: job.name,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const payload = job.data as { leadId: string };

    await this.emailQueueService.sendLeadNotificationJob({ leadId: payload.leadId });
    await this.webhookQueueService.sendWebhookJob({ leadId: payload.leadId });

    this.logger.info({
      event: 'lead.processing.completed',
      leadId: payload.leadId,
      timestamp: new Date().toISOString(),
    });
  }
}