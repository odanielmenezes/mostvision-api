import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { MetricsService } from '../../observability/metrics/metrics.service';
import { CreateClientDto } from './dto/create-client.dto';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
	constructor(
		@InjectRepository(Client)
		private readonly clientsRepository: Repository<Client>,
		private readonly logger: PinoLogger,
		private readonly metricsService: MetricsService,
	) {}

	onModuleInit(): void {
		this.logger.setContext(ClientsService.name);
	}

	async create(createClientDto: CreateClientDto): Promise<Client> {
		const client = this.clientsRepository.create({
			...createClientDto,
			apiKey: this.generateApiKey(),
		});

		const savedClient = await this.clientsRepository.save(client);
		this.metricsService.increment('clients.created');

		this.logger.info({
			event: 'client.created',
			clientId: savedClient.id,
			timestamp: new Date().toISOString(),
		});

		return savedClient;
	}

	async findAll(): Promise<Client[]> {
		return this.clientsRepository.find({
			order: { createdAt: 'DESC' },
		});
	}

	async findOne(id: string): Promise<Client> {
		const client = await this.clientsRepository.findOne({ where: { id } });

		if (!client) {
			throw new NotFoundException('Client not found');
		}

		return client;
	}

	async findByApiKey(apiKey: string): Promise<Client | null> {
		return this.clientsRepository.findOne({ where: { apiKey } });
	}

	private generateApiKey(): string {
		return randomBytes(32).toString('hex');
	}
}
