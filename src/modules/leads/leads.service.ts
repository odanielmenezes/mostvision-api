import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { LEAD_CREATED_ROUTING_KEY } from '../../common/rabbitmq/rabbitmq.constants';
import { RabbitMQService } from '../../common/rabbitmq/rabbitmq.service';
import { LEAD_CREATED_EVENT_NAME, LeadCreatedEvent } from '../../events/lead-created.event';
import { MetricsService } from '../../observability/metrics/metrics.service';
import { Client } from '../clients/entities/client.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Lead } from './entities/lead.entity';

@Injectable()
export class LeadsService implements OnModuleInit {
	constructor(
		@InjectRepository(Lead)
		private readonly leadsRepository: Repository<Lead>,
		private readonly rabbitMQService: RabbitMQService,
		private readonly logger: PinoLogger,
		private readonly metricsService: MetricsService,
	) {}

	onModuleInit(): void {
		this.logger.setContext(LeadsService.name);
	}

	async createForClient(client: Client, createLeadDto: CreateLeadDto): Promise<Lead> {
		const lead = this.leadsRepository.create({
			...createLeadDto,
			clientId: client.id,
			phone: createLeadDto.phone ?? null,
			message: createLeadDto.message ?? null,
		});

		const savedLead = await this.leadsRepository.save(lead);
		this.metricsService.increment('leads.created');

		const event: LeadCreatedEvent = { leadId: savedLead.id };
		await this.rabbitMQService.publish(LEAD_CREATED_ROUTING_KEY, event);

		this.logger.info({
			event: LEAD_CREATED_EVENT_NAME,
			clientId: client.id,
			leadId: savedLead.id,
			timestamp: new Date().toISOString(),
		});

		return savedLead;
	}

	async findOne(id: string): Promise<Lead> {
		const lead = await this.leadsRepository.findOne({ where: { id } });

		if (!lead) {
			throw new NotFoundException('Lead not found');
		}

		return lead;
	}
}
