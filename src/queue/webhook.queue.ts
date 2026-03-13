import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WEBHOOK_JOB_SEND, WEBHOOK_QUEUE } from './queue.constants';

@Injectable()
export class WebhookQueueService {
  constructor(@InjectQueue(WEBHOOK_QUEUE) private readonly webhookQueue: Queue) {}

  async sendWebhookJob(data: Record<string, unknown>, delay = 0): Promise<void> {
    await this.webhookQueue.add(WEBHOOK_JOB_SEND, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
      delay,
    });
  }
}