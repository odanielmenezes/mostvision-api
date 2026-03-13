import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import {
  EMAIL_JOB_SEND_EMAIL,
  EMAIL_JOB_SEND_LEAD_NOTIFICATION,
  EMAIL_QUEUE,
} from '../queue/queue.constants';
import { MetricsService } from '../observability/metrics/metrics.service';
import { ClientsService } from '../modules/clients/clients.service';
import { EmailService } from '../modules/email/email.service';
import { LeadsService } from '../modules/leads/leads.service';

@Injectable()
@Processor(EMAIL_QUEUE)
export class EmailWorker extends WorkerHost {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly leadsService: LeadsService,
    private readonly emailService: EmailService,
    private readonly logger: PinoLogger,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.setContext(EmailWorker.name);

    switch (job.name) {
      case EMAIL_JOB_SEND_LEAD_NOTIFICATION:
        await this.handleLeadCreated(job.data as { leadId: string });
        return;
      case EMAIL_JOB_SEND_EMAIL:
        this.logger.info({
          event: 'email.send',
          action: 'worker_processed',
          data: job.data,
          timestamp: new Date().toISOString(),
        });
        this.metricsService.increment('workers.email.send_email_processed');
        return;
      default:
        this.logger.warn({
          event: 'email.unknown_job',
          jobName: job.name,
          timestamp: new Date().toISOString(),
        });
    }
  }

  private async handleLeadCreated(payload: { leadId: string }): Promise<void> {
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