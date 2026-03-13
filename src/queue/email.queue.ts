import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EMAIL_JOB_SEND_EMAIL,
  EMAIL_JOB_SEND_LEAD_NOTIFICATION,
  EMAIL_QUEUE,
} from './queue.constants';

interface QueueJobOptions {
  delay?: number;
}

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async sendEmailJob(
    data: Record<string, unknown>,
    options: QueueJobOptions = {},
  ): Promise<void> {
    await this.emailQueue.add(EMAIL_JOB_SEND_EMAIL, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
      delay: options.delay,
    });
  }

  async sendLeadNotificationJob(
    data: { leadId: string },
    options: QueueJobOptions = {},
  ): Promise<void> {
    await this.emailQueue.add(EMAIL_JOB_SEND_LEAD_NOTIFICATION, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
      delay: options.delay,
    });
  }
}