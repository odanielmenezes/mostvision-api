import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import type { ConsumeMessage, Options } from 'amqplib';
import { MOSTVISION_EVENTS_EXCHANGE } from './rabbitmq.constants';

interface ConsumeWithRetryOptions {
  queue: string;
  routingKey: string;
  retryQueue: string;
  retryRoutingKey: string;
  deadLetterQueue: string;
  deadLetterRoutingKey: string;
  retryDelaysMs: readonly number[];
  handler: (payload: unknown) => Promise<void>;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection?: AmqpConnectionManager;
  private channel?: ChannelWrapper;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');

    this.connection = connect([url]);
    this.connection.on('connect', () => {
      this.logger.log(`Connected to RabbitMQ at ${url}`);
    });
    this.connection.on('disconnect', (error) => {
      this.logger.error('RabbitMQ disconnected', error.err);
    });

    this.channel = this.connection.createChannel({
      setup: async (channel) => {
        await channel.assertExchange(MOSTVISION_EVENTS_EXCHANGE, 'topic', {
          durable: true,
        });
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publish(
    routingKey: string,
    payload: unknown,
    options?: Options.Publish,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.publish(
      MOSTVISION_EVENTS_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      options as never,
    );

    this.logger.log({
      event: routingKey,
      action: 'published',
      timestamp: new Date().toISOString(),
    });
  }

  async consume(
    queue: string,
    routingKey: string,
    handler: (payload: unknown) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.addSetup(async (channel) => {
      await channel.assertExchange(MOSTVISION_EVENTS_EXCHANGE, 'topic', {
        durable: true,
      });
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, MOSTVISION_EVENTS_EXCHANGE, routingKey);

      await channel.consume(queue, async (message: ConsumeMessage | null) => {
        if (!message) {
          return;
        }

        try {
          const payload = JSON.parse(message.content.toString()) as unknown;
          await handler(payload);
          this.logger.log({
            event: routingKey,
            queue,
            action: 'consumed',
            timestamp: new Date().toISOString(),
          });
          channel.ack(message);
        } catch (error) {
          this.logger.error({
            event: routingKey,
            queue,
            action: 'consume_error',
            error,
            timestamp: new Date().toISOString(),
          });
          channel.nack(message, false, false);
        }
      });
    });
  }

  async consumeWithRetry(options: ConsumeWithRetryOptions): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.addSetup(async (channel) => {
      await channel.assertExchange(MOSTVISION_EVENTS_EXCHANGE, 'topic', {
        durable: true,
      });

      await channel.assertQueue(options.deadLetterQueue, { durable: true });
      await channel.bindQueue(
        options.deadLetterQueue,
        MOSTVISION_EVENTS_EXCHANGE,
        options.deadLetterRoutingKey,
      );

      await channel.assertQueue(options.retryQueue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': MOSTVISION_EVENTS_EXCHANGE,
          'x-dead-letter-routing-key': options.routingKey,
        },
      });
      await channel.bindQueue(
        options.retryQueue,
        MOSTVISION_EVENTS_EXCHANGE,
        options.retryRoutingKey,
      );

      await channel.assertQueue(options.queue, { durable: true });
      await channel.bindQueue(
        options.queue,
        MOSTVISION_EVENTS_EXCHANGE,
        options.routingKey,
      );

      await channel.consume(options.queue, async (message: ConsumeMessage | null) => {
        if (!message) {
          return;
        }

        const rawRetryCount = message.properties.headers?.['x-retry-count'];
        const retryCount = Number(rawRetryCount ?? 0);

        try {
          const payload = JSON.parse(message.content.toString()) as unknown;
          await options.handler(payload);
          channel.ack(message);

          this.logger.log({
            event: options.routingKey,
            queue: options.queue,
            action: 'consumed',
            retryCount,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          const shouldRetry = retryCount < options.retryDelaysMs.length;
          const messageHeaders = message.properties.headers ?? undefined;

          if (shouldRetry) {
            const nextDelay = options.retryDelaysMs[retryCount];
            await this.publish(
              options.retryRoutingKey,
              JSON.parse(message.content.toString()) as unknown,
              {
                headers: {
                  ...messageHeaders,
                  'x-retry-count': retryCount + 1,
                },
                expiration: String(nextDelay),
              } as Options.Publish,
            );

            this.logger.warn({
              event: options.routingKey,
              queue: options.queue,
              action: 'retry_scheduled',
              retryCount: retryCount + 1,
              delayMs: nextDelay,
              timestamp: new Date().toISOString(),
            });
          } else {
            await this.publish(
              options.deadLetterRoutingKey,
              JSON.parse(message.content.toString()) as unknown,
              {
                headers: {
                  ...messageHeaders,
                  'x-retry-count': retryCount,
                },
              } as Options.Publish,
            );

            this.logger.error({
              event: options.routingKey,
              queue: options.queue,
              action: 'sent_to_dlq',
              retryCount,
              error,
              timestamp: new Date().toISOString(),
            });
          }

          channel.ack(message);
        }
      });
    });
  }
}