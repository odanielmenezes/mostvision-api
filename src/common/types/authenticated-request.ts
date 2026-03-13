import type { Request } from 'express';
import { Client } from '../../modules/clients/entities/client.entity';

export interface AuthenticatedRequest extends Request {
  client?: Client;
}