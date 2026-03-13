import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-keys.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

@Controller({
	path: 'leads',
	version: '1',
})
export class LeadsController {
	constructor(private readonly leadsService: LeadsService) {}

	@Post()
	@UseGuards(ApiKeyGuard)
	create(@Body() createLeadDto: CreateLeadDto, @Req() request: AuthenticatedRequest) {
		if (!request.client) {
			throw new UnauthorizedException('Client not resolved for API key');
		}

		return this.leadsService.createForClient(request.client, createLeadDto);
	}
}
