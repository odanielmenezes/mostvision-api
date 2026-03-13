# MostVision API

API backend multi-tenant para orquestrar landing pages de multiplos clientes com processamento orientado a eventos.

O fluxo principal da plataforma:

Landing page -> POST /v1/leads -> validacao de x-api-key -> rate limit por cliente -> persistencia no PostgreSQL -> publicacao do evento lead.created -> consumo por worker -> envio de email.

## Stack

- Node.js + NestJS
- PostgreSQL + TypeORM
- RabbitMQ
- @nestjs/throttler
- nestjs-pino (logs estruturados)
- class-validator + class-transformer
- ConfigModule via .env
- Docker Compose para infraestrutura local

## Estrutura

src/
  events/
    lead-created.event.ts
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
    rabbitmq/
  database/
  workers/

## Variaveis de ambiente

O arquivo .env ja deve conter:

PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=mostvision

RABBITMQ_URL=amqp://localhost:5672

## Subindo infraestrutura

```bash
docker compose up -d
```

Servicos:

- PostgreSQL: 5432
- RabbitMQ AMQP: 5672
- RabbitMQ Management UI: 15672

Painel RabbitMQ:

- URL: http://localhost:15672
- Usuario: guest
- Senha: guest

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
- publicacao/consumo de eventos RabbitMQ
- retry agendado
- envio para DLQ
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

- Exchange: mostvision.events (topic)
- Evento publicado: lead.created
- Payload do evento: { "leadId": "uuid" }
- Queue principal: lead.created.queue
- Queue retry: lead.created.retry
- Queue DLQ: lead.created.dlq

O worker busca os dados completos do lead no banco e processa o envio de email.

## Retry e DLQ

Estrategia de retries:

- 1 tentativa inicial
- retry apos 5 segundos
- retry apos 30 segundos
- retry apos 2 minutos
- excedeu tentativas -> DLQ

Cabecalho usado para controle:

- x-retry-count

Fluxo:

lead.created -> worker -> erro -> lead.created.retry (com expiration) -> volta para lead.created.queue -> excedeu retries -> lead.created.dlq

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
- RabbitMQ encapsulado em modulo reutilizavel com suporte a retry/DLQ
- Worker e orientado a banco como source of truth (evento enxuto)
- Modulo de observabilidade separado para logger e metricas em memoria

## Teste rapido do fluxo

1. Suba a infraestrutura: docker compose up -d
2. Inicie a API: npm run start:dev
3. Crie um cliente em POST /v1/clients
4. Use a apiKey retornada para enviar POST /v1/leads
5. Verifique logs do worker (consumo, retries se houver falha, ou sucesso)

