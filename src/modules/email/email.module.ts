import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { EmailService } from './email.service';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [ClientsModule, LeadsModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
