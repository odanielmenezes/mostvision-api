import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { ANALYTICS_JOB_PROCESS, ANALYTICS_QUEUE } from '../queue/queue.constants';

@Injectable()
@Processor(ANALYTICS_QUEUE)
export class AnalyticsWorker extends WorkerHost {
  constructor(private readonly logger: PinoLogger) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.setContext(AnalyticsWorker.name);

    if (job.name !== ANALYTICS_JOB_PROCESS) {
      this.logger.warn({
        event: 'analytics.unknown_job',
        jobName: job.name,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.info({
      event: 'analytics.event.processed',
      payload: job.data,
      timestamp: new Date().toISOString(),
    });
  }
}