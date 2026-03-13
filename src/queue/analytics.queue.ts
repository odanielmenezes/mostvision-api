import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ANALYTICS_JOB_PROCESS, ANALYTICS_QUEUE } from './queue.constants';

@Injectable()
export class AnalyticsQueueService {
  constructor(
    @InjectQueue(ANALYTICS_QUEUE) private readonly analyticsQueue: Queue,
  ) {}

  async processAnalyticsEventJob(
    data: Record<string, unknown>,
    delay = 0,
  ): Promise<void> {
    await this.analyticsQueue.add(ANALYTICS_JOB_PROCESS, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
      delay,
    });
  }
}