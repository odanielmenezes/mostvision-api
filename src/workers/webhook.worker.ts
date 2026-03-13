import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { WEBHOOK_JOB_SEND, WEBHOOK_QUEUE } from '../queue/queue.constants';

@Injectable()
@Processor(WEBHOOK_QUEUE)
export class WebhookWorker extends WorkerHost {
  constructor(private readonly logger: PinoLogger) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.setContext(WebhookWorker.name);

    if (job.name !== WEBHOOK_JOB_SEND) {
      this.logger.warn({
        event: 'webhook.unknown_job',
        jobName: job.name,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.info({
      event: 'webhook.dispatched',
      payload: job.data,
      timestamp: new Date().toISOString(),
    });
  }
}