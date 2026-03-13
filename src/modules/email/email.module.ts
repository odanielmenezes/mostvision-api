import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { EmailService } from './email.service';
import { EmailWorker } from '../../workers/email.worker';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [ClientsModule, LeadsModule],
  providers: [EmailService, EmailWorker],
  exports: [EmailService],
})
export class EmailModule {}
