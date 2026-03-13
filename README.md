# MostVision API

API backend multi-tenant para orquestrar landing pages de multiplos clientes com processamento orientado a eventos.

O fluxo principal da plataforma:

Landing page -> POST /v1/leads -> validacao de x-api-key -> rate limit por cliente -> persistencia no PostgreSQL -> enqueue de job no Redis (BullMQ) -> workers assíncronos -> envio de email/webhook/processamentos.

## Stack

- Node.js + NestJS
- PostgreSQL + TypeORM
- Redis + BullMQ (@nestjs/bullmq)
- @nestjs/throttler
- nestjs-pino (logs estruturados)
- class-validator + class-transformer
- ConfigModule via .env
- Docker Compose para infraestrutura local

## Estrutura

src/
  observability/
    logger/
    metrics/
  modules/
    auth/
    analytics/
    clients/
    leads/
    email/
  common/
    guards/
  database/
  queue/
    queue.module.ts
    email.queue.ts
    webhook.queue.ts
    analytics.queue.ts
    lead-processing.queue.ts
  workers/
    email.worker.ts
    webhook.worker.ts
    analytics.worker.ts
    lead-processing.worker.ts

## Variaveis de ambiente

O arquivo .env ja deve conter:

PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=mostvision

REDIS_URL=redis://user:password@host:port

## Subindo infraestrutura

```bash
docker compose up -d
```

Servicos:

- PostgreSQL: 5432
- Redis: use REDIS_URL (Railway)

Observacao: a fila assíncrona agora usa Redis/BullMQ. Nao ha dependencia de RabbitMQ.

## Rodando a API

```bash
npm install
npm run start:dev
```

## Rate Limiting

- Implementado com @nestjs/throttler como guard global.
- Limite: 10 requisicoes por minuto.
- Tracker customizado:
  - prioridade para clientId resolvido a partir da x-api-key
  - fallback para o valor da x-api-key

Isso protege endpoints de spam/bots sem depender de IP.

## Logs estruturados

Logger global configurado com nestjs-pino.

Eventos relevantes registrados:

- client.created
- lead.created
- queue.job.enqueued
- queue.job.processed
- queue.job.failed
- analytics.event.created

Exemplo de log:

```json
{
  "event": "lead.created",
  "clientId": "...",
  "leadId": "...",
  "timestamp": "..."
}
```

## Endpoints

### Criar cliente

POST /v1/clients

Payload:

```json
{
  "name": "Empresa A",
  "emailReceiver": "contato@empresa.com"
}
```

Resposta inclui apiKey gerada automaticamente.

### Listar clientes

GET /v1/clients

### Buscar cliente por id

GET /v1/clients/:id

### Criar lead

POST /v1/leads

Header obrigatorio:

```text
x-api-key: <API_KEY_DO_CLIENTE>
```

Payload:

```json
{
  "name": "Joao",
  "email": "joao@email.com",
  "phone": "519999999",
  "message": "Quero orcamento"
}
```

### Criar evento de analytics

POST /v1/events

Header obrigatorio:

```text
x-api-key: <API_KEY_DO_CLIENTE>
```

Payload:

```json
{
  "eventType": "page_view",
  "payload": {
    "page": "/landing-page-a"
  }
}
```

Tipos permitidos de eventType:

- page_view
- cta_click
- form_view
- form_submit

## Filas e eventos

- BullMQ queues registradas:
  - email
  - webhook
  - analytics
  - lead-processing

- Exemplos de jobs:
  - send-email
  - send-lead-notification
  - send-webhook
  - process-lead
  - process-analytics-event

O serviço de leads enfileira process-lead e o worker distribui para email/webhook.

## Retry, backoff e delay

Estrategia BullMQ aplicada nos producers:

- attempts: 3
- backoff: exponential com delay base de 5000ms
- suporte a delay por job

Exemplo aplicado:

```ts
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
}
```

## Fluxo assíncrono de lead

POST /v1/leads -> grava lead -> enqueue process-lead -> worker lead-processing -> enqueue send-lead-notification + send-webhook -> workers finais processam.

## Analytics

Tabela AnalyticsEvent:

- id
- clientId
- eventType
- payload (jsonb)
- createdAt

Esses dados formam a base para dashboards futuros de conversao por cliente.

## Observacoes de arquitetura

- API key guard continua desacoplado no modulo auth
- Middleware resolve contexto do cliente antes dos guards globais
- QueueModule centraliza configuracao BullMQ e Redis
- Producers e workers separados por responsabilidade
- Modulo de observabilidade separado para logger e metricas em memoria

## Teste rapido do fluxo

1. Suba a infraestrutura: docker compose up -d
2. Inicie a API: npm run start:dev
3. Crie um cliente em POST /v1/clients
4. Use a apiKey retornada para enviar POST /v1/leads
5. Verifique logs do worker (consumo, retries se houver falha, ou sucesso)

