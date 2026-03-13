import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: AuthenticatedRequest): Promise<string> {
    if (req.client?.id) {
      return `client:${req.client.id}`;
    }

    const apiKeyHeader = req.headers['x-api-key'];
    let apiKey: string | undefined;

    if (typeof apiKeyHeader === 'string') {
      apiKey = apiKeyHeader;
    } else if (Array.isArray(apiKeyHeader)) {
      apiKey = apiKeyHeader[0];
    }

    if (apiKey) {
      return `apikey:${apiKey}`;
    }

    return 'anonymous';
  }
}