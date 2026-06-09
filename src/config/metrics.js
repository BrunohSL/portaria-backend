const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'portaria_' });

const httpRequestDuration = new client.Histogram({
  name: 'portaria_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'portaria_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'portaria_active_connections',
  help: 'Number of active HTTP connections'
});

const callsTotal = new client.Counter({
  name: 'portaria_calls_total',
  help: 'Total calls processed',
  labelNames: ['condominium_id', 'status']
});

const callDuration = new client.Histogram({
  name: 'portaria_call_duration_seconds',
  help: 'Duration of call sessions in seconds',
  labelNames: ['condominium_id'],
  buckets: [5, 15, 30, 60, 120, 300, 600]
});

const integrationErrors = new client.Counter({
  name: 'portaria_integration_errors_total',
  help: 'Total integration errors',
  labelNames: ['integration']
});

const dbPoolMetrics = new client.Gauge({
  name: 'portaria_db_pool_connections',
  help: 'Database connection pool metrics',
  labelNames: ['state']
});

const activeCalls = new client.Gauge({
  name: 'portaria_active_calls',
  help: 'Number of active call sessions'
});

module.exports = {
  client,
  httpRequestDuration,
  httpRequestsTotal,
  activeConnections,
  callsTotal,
  callDuration,
  integrationErrors,
  dbPoolMetrics,
  activeCalls
};
