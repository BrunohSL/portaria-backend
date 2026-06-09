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
const { client: metricsClient, dbPoolMetrics } = require('./config/metrics');
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
  customSiteTitle: 'Portaria API Docs'
}));

// Rotas da aplicacao
const userRoutes = require('./routes/userRoutes');
const devRoutes = require('./routes/devRoutes');
const employeeRoleRoutes = require('./routes/employeeRoleRoutes');
const visitorDataFieldRoutes = require('./routes/visitorDataFieldRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const twilioRoutes = require('./routes/twilioRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/condominiums', condominiumRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dev', devRoutes);
app.use('/api/employee-roles', employeeRoleRoutes);
app.use('/api/visitor-data-fields', visitorDataFieldRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/twilio', twilioRoutes);

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
