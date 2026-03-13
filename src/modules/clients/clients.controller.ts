import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientsService } from './clients.service';

@Controller({
	path: 'clients',
	version: '1',
})
export class ClientsController {
	constructor(private readonly clientsService: ClientsService) {}

	@Post()
	create(@Body() createClientDto: CreateClientDto) {
		return this.clientsService.create(createClientDto);
	}

	@Get()
	findAll() {
		return this.clientsService.findAll();
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.clientsService.findOne(id);
	}
}
