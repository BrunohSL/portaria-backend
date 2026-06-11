// Load model associations before anything else
require('./models/associations');

const app = require('./app');
const { port } = require('./config/env');
const logger = require('./config/logger');
const sequelize = require('./config/sequelize');

// Socket.IO setup
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('./config/env');

const server = http.createServer(app);

// WebSocket server pro Twilio ConversationRelay (path-scoped pra não conflitar com Socket.IO)
const { WebSocketServer } = require('ws');
const conversationRelay = require('./integrations/twilio/conversationRelay');

const conversationRelayWss = new WebSocketServer({ noServer: true });
conversationRelayWss.on('connection', conversationRelay.handleConnection);

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  // DEBUG: toda tentativa de upgrade de WebSocket que CHEGA no Node.
  //  - Se uma ligação Twilio NÃO gerar esta linha → o WS está sendo barrado
  //    antes do app (Cloudflare ou Traefik não encaminham o upgrade).
  //  - Se gerar mas com pathname diferente → mismatch de rota.
  logger.info({
    msg: '[upgrade] WebSocket recebido',
    pathname,
    host: request.headers.host,
    upgradeHeader: request.headers.upgrade,
    connectionHeader: request.headers.connection,
    forwardedFor: request.headers['x-forwarded-for'],
    forwardedProto: request.headers['x-forwarded-proto']
  });
  if (pathname === '/api/twilio/conversation-relay') {
    conversationRelayWss.handleUpgrade(request, socket, head, (ws) => {
      conversationRelayWss.emit('connection', ws, request);
    });
  }
  // Outros paths: Socket.IO faz seu próprio upgrade handler internamente
});

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.query.token || socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Token nao fornecido'));
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.condominiumId = decoded.condominium_id;
    next();
  } catch {
    next(new Error('Token invalido'));
  }
});

io.on('connection', (socket) => {
  logger.info({ msg: 'Socket connected', userId: socket.userId, role: socket.userRole });

  // Juntar em rooms apropriadas
  if (socket.userRole === 'ADM') {
    socket.join('super_admin');
  }

  if (socket.condominiumId) {
    socket.join(`condominium:${socket.condominiumId}`);
  }

  socket.on('disconnect', () => {
    logger.info({ msg: 'Socket disconnected', userId: socket.userId });
  });
});

// Expor io para uso nos services
app.locals.io = io;

server.listen(port, () => {
  logger.info({ msg: `Servidor rodando na porta ${port}`, health: '/health', docs: '/api-docs' });
});

// Graceful shutdown
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ msg: `Recebido ${signal}, iniciando shutdown graceful...` });

  server.close(() => {
    logger.info({ msg: 'HTTP server fechado' });
  });

  io.close();

  try {
    await sequelize.close();
    logger.info({ msg: 'Conexoes com banco fechadas' });
  } catch (err) {
    logger.error({ msg: 'Erro ao fechar conexoes', error: err.message });
  }

  setTimeout(() => {
    logger.warn({ msg: 'Shutdown forcado apos timeout' });
    process.exit(1);
  }, 15000).unref();

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({
    msg: 'Unhandled Promise Rejection',
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

process.on('uncaughtException', (error) => {
  logger.error({
    msg: 'Uncaught Exception — shutdown forcado',
    error: error.message,
    stack: error.stack
  });
  shutdown('uncaughtException');
});

app.locals.isShuttingDown = () => isShuttingDown;
app.locals.sequelize = sequelize;
