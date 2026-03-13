import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { ClientsService } from '../../modules/clients/clients.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly clientsService: ClientsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

        if (request.client) {
            return true;
        }

        const apiKeyHeader = request.headers['x-api-key'];
        let apiKey: string | undefined;

        if (typeof apiKeyHeader === 'string') {
            apiKey = apiKeyHeader;
        } else if (Array.isArray(apiKeyHeader)) {
            apiKey = apiKeyHeader[0];
        }

        if (!apiKey) {
            throw new UnauthorizedException('x-api-key header is required');
        }

        const client = await this.clientsService.findByApiKey(apiKey);

        if (!client) {
            throw new UnauthorizedException('Invalid API key');
        }

        request.client = client;

        return true;
  }
}