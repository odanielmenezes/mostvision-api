import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  LEAD_PROCESSING_JOB_PROCESS,
  LEAD_PROCESSING_QUEUE,
} from './queue.constants';

@Injectable()
export class LeadProcessingQueueService {
  constructor(
    @InjectQueue(LEAD_PROCESSING_QUEUE)
    private readonly leadProcessingQueue: Queue,
  ) {}

  async processLeadJob(data: { leadId: string }, delay = 0): Promise<void> {
    await this.leadProcessingQueue.add(LEAD_PROCESSING_JOB_PROCESS, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
      delay,
    });
  }
}