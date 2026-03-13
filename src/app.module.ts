import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from './modules/clients/clients.module';
import { LeadsModule } from './modules/leads/leads.module';
import { EmailModule } from './modules/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';
import { HttpLoggerModule } from './observability/logger/http-logger.module';
import { ApiKeyThrottlerGuard } from './observability/logger/api-key-throttler.guard';
import { ApiKeyClientMiddleware } from './modules/auth/middleware/api-key-client.middleware';
import { MetricsModule } from './observability/metrics/metrics.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 10,
      },
    ]),
    HttpLoggerModule,
    MetricsModule,
    DatabaseModule,
    RabbitMQModule,
    ClientsModule,
    LeadsModule,
    EmailModule,
    AuthModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ApiKeyClientMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
