import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { ClientsService } from '../../clients/clients.service';

@Injectable()
export class ApiKeyClientMiddleware implements NestMiddleware {
  constructor(private readonly clientsService: ClientsService) {}

  async use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    const apiKeyHeader = request.headers['x-api-key'];
    let apiKey: string | undefined;

    if (typeof apiKeyHeader === 'string') {
      apiKey = apiKeyHeader;
    } else if (Array.isArray(apiKeyHeader)) {
      apiKey = apiKeyHeader[0];
    }

    if (apiKey) {
      const client = await this.clientsService.findByApiKey(apiKey);
      if (client) {
        request.client = client;
      }
    }

    next();
  }
}