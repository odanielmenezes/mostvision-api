import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Lead } from '../leads/entities/lead.entity';

@Injectable()
export class EmailService implements OnModuleInit {
  constructor(private readonly logger: PinoLogger) {}

  onModuleInit(): void {
    this.logger.setContext(EmailService.name);
  }

  async sendLeadCreatedNotification(
    clientName: string,
    emailReceiver: string,
    lead: Lead,
  ): Promise<void> {
    this.logger.info({
      event: 'lead.email_notification',
      clientName,
      emailReceiver,
      leadId: lead.id,
      leadEmail: lead.email,
      leadName: lead.name,
      timestamp: new Date().toISOString(),
      message: `Novo lead recebido para empresa ${clientName}`,
    });
  }
}