const { httpRequestDuration, httpRequestsTotal, activeConnections } = require('../config/metrics');

function normalizeRoute(req) {
  const route = (req.route && req.route.path) || req.path || req.originalUrl || '/unknown';
  return String(route).replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:id');
}

function metricsCollector(req, res, next) {
  if (req.path === '/metrics' || req.path === '/health') {
    return next();
  }

  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    activeConnections.dec();
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode
    };
    end(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
}

module.exports = metricsCollector;
