const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const correlationId = require('./middlewares/correlationId');
const metricsCollector = require('./middlewares/metricsCollector');
const requestTimeout = require('./middlewares/requestTimeout');
const loggerMiddleware = require('./middlewares/logger');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const auditMiddleware = require('./middlewares/audit');
const { authMiddleware } = require('./middlewares/auth');
const { checkRole } = require('./middlewares/authorization');
const { client: metricsClient, dbPoolMetrics, queueDepth } = require('./config/metrics');
const { callQueue } = require('./config/queue');
const authRoutes = require('./routes/authRoutes');
const condominiumRoutes = require('./routes/condominiumRoutes');
const callRoutes = require('./routes/callRoutes');
const auditRoutes = require('./routes/auditRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();

// Trust proxy — necessario atras do Traefik
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Gzip compression
app.use(compression({ threshold: 1024 }));

// CORS
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true
}));

// Rate limiting global (100 req/min)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisicoes. Tente novamente em breve.' },
  handler: (req, res) => {
    logger.warn({ msg: 'Rate limit exceeded', ip: req.ip, path: req.path });
    res.status(429).json({ success: false, error: 'Muitas requisicoes. Tente novamente em breve.' });
  }
});
app.use(globalLimiter);

// Rate limiting para auth (10 req/min)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas de login. Aguarde 1 minuto.' }
});
app.use('/api/auth', authLimiter);

// Rate limiting para webhook Twilio (30 req/min)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de webhooks excedido.' }
});
app.use('/api/calls/webhook', webhookLimiter);

// Middlewares globais
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(correlationId);
app.use(metricsCollector);
app.use(requestTimeout(30000));
app.use(loggerMiddleware);
app.use(auditMiddleware);

// Health check
app.get('/health', async (req, res) => {
  if (app.locals.isShuttingDown && app.locals.isShuttingDown()) {
    return res.status(503).json({ status: 'shutting_down', timestamp: new Date().toISOString() });
  }

  const health = { status: 'ok', timestamp: new Date().toISOString(), services: {} };

  try {
    if (app.locals.sequelize) {
      await app.locals.sequelize.authenticate();
      health.services.database = 'ok';
    }
  } catch {
    health.status = 'degraded';
    health.services.database = 'unreachable';
  }

  try {
    await callQueue.isReady();
    health.services.redis = 'ok';
  } catch {
    health.status = 'degraded';
    health.services.redis = 'unreachable';
  }

  if (health.status !== 'ok') {
    return res.status(503).json(health);
  }

  res.json(health);
});

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    const metricsToken = process.env.METRICS_TOKEN;
    if (!metricsToken) {
      return res.status(503).json({ success: false, error: 'Metricas nao configuradas' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${metricsToken}`) {
      return res.status(401).json({ success: false, error: 'Acesso negado' });
    }
  }
  try {
    if (app.locals.sequelize) {
      const pool = app.locals.sequelize.connectionManager.pool;
      if (pool) {
        dbPoolMetrics.set({ state: 'used' }, pool.using || 0);
        dbPoolMetrics.set({ state: 'idle' }, pool.available || 0);
        dbPoolMetrics.set({ state: 'waiting' }, pool.waiting || 0);
      }
    }
    try {
      const counts = await callQueue.getJobCounts();
      queueDepth.set({ queue: callQueue.name, state: 'waiting' }, counts.waiting || 0);
      queueDepth.set({ queue: callQueue.name, state: 'active' }, counts.active || 0);
      queueDepth.set({ queue: callQueue.name, state: 'completed' }, counts.completed || 0);
      queueDepth.set({ queue: callQueue.name, state: 'failed' }, counts.failed || 0);
      queueDepth.set({ queue: callQueue.name, state: 'delayed' }, counts.delayed || 0);
    } catch (qErr) {
      logger.error({ msg: 'Erro ao coletar metricas de filas', error: qErr.message });
    }

    res.set('Content-Type', metricsClient.register.contentType);
    res.end(await metricsClient.register.metrics());
  } catch (err) {
    logger.error({ msg: 'Erro ao coletar metricas', error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao coletar metricas' });
  }
});

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CCA API Docs'
}));

// Bull Board
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const bullBoardAdapter = new ExpressAdapter();
bullBoardAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullAdapter(callQueue)],
  serverAdapter: bullBoardAdapter
});

if (process.env.NODE_ENV === 'production') {
  app.use('/admin/queues', authMiddleware, checkRole(['ADM']), bullBoardAdapter.getRouter());
} else {
  app.use('/admin/queues', bullBoardAdapter.getRouter());
}

// Rotas da aplicacao
app.use('/api/auth', authRoutes);
app.use('/api/condominiums', condominiumRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/audit', auditRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota nao encontrada',
    path: req.path,
    correlationId: req.correlationId
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
