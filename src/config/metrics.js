const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'cca_' });

const httpRequestDuration = new client.Histogram({
  name: 'cca_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'cca_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'cca_active_connections',
  help: 'Number of active HTTP connections'
});

const callsTotal = new client.Counter({
  name: 'cca_calls_total',
  help: 'Total calls processed',
  labelNames: ['condominium_id', 'status']
});

const callDuration = new client.Histogram({
  name: 'cca_call_duration_seconds',
  help: 'Duration of call sessions in seconds',
  labelNames: ['condominium_id'],
  buckets: [5, 15, 30, 60, 120, 300, 600]
});

const integrationErrors = new client.Counter({
  name: 'cca_integration_errors_total',
  help: 'Total integration errors',
  labelNames: ['integration']
});

const queueDepth = new client.Gauge({
  name: 'cca_queue_depth',
  help: 'Number of jobs in Bull queues by state',
  labelNames: ['queue', 'state']
});

const dbPoolMetrics = new client.Gauge({
  name: 'cca_db_pool_connections',
  help: 'Database connection pool metrics',
  labelNames: ['state']
});

const activeCalls = new client.Gauge({
  name: 'cca_active_calls',
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
  queueDepth,
  dbPoolMetrics,
  activeCalls
};
