export const MOSTVISION_EVENTS_EXCHANGE = 'mostvision.events';
export const LEAD_CREATED_ROUTING_KEY = 'lead.created';
export const LEAD_CREATED_QUEUE = 'lead.created.queue';
export const LEAD_CREATED_RETRY_QUEUE = 'lead.created.retry';
export const LEAD_CREATED_RETRY_ROUTING_KEY = 'lead.created.retry';
export const LEAD_CREATED_DLQ = 'lead.created.dlq';
export const LEAD_CREATED_DLQ_ROUTING_KEY = 'lead.created.dlq';
export const LEAD_CREATED_RETRY_DELAYS_MS = [5000, 30000, 120000] as const;