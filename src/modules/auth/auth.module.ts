import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-keys.guard';
import { ClientsModule } from '../clients/clients.module';
import { ApiKeyClientMiddleware } from './middleware/api-key-client.middleware';

@Module({
  imports: [ClientsModule],
  providers: [ApiKeyGuard, ApiKeyClientMiddleware],
  exports: [ApiKeyGuard, ApiKeyClientMiddleware, ClientsModule],
})
export class AuthModule {}
