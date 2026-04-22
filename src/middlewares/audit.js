const auditService = require('../services/auditService');

const SENSITIVE_FIELDS = new Set([
  'password', 'new_password', 'old_password', 'token', 'secret',
  'authorization', 'bearertoken', 'api_key', 'apikey', 'accesstoken',
  'refreshtoken', 'x-webhook-signature', 'cookie'
]);

function redactSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clean)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof clean[key] === 'object' && clean[key] !== null) {
      clean[key] = redactSensitive(clean[key]);
    }
  }
  return clean;
}

const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    res.send = originalSend;

    setImmediate(() => {
      const isUnknownRoute = res.statusCode === 404 && getResource(req.path) === 'UNKNOWN';
      const shouldAudit = !isUnknownRoute && shouldAuditRequest(req);

      if (shouldAudit) {
        const auditData = {
          user_id: req.userId || null,
          action: getAction(req.method, req.path),
          resource: getResource(req.path),
          resource_id: getResourceId(req),
          method: req.method,
          endpoint: req.path,
          request_body: redactSensitive(req.body),
          request_params: req.params,
          request_query: redactSensitive(req.query),
          response_status: res.statusCode,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('user-agent'),
          error_message: res.statusCode >= 400 ? getErrorMessage(data) : null
        };

        auditService.log(auditData);
      }
    });

    return res.send(data);
  };

  next();
};

function shouldAuditRequest(req) {
  const excludedPaths = [
    '/health', '/metrics', '/.well-known/', '/security.txt',
    '/admin/queues', '/api-docs', '/swagger-ui', '/favicon'
  ];

  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return false;
  }

  if (req.path.includes('swagger') || req.path.includes('api-docs')) {
    return false;
  }

  return true;
}

function getAction(method, path) {
  if (path.includes('/login')) return 'LOGIN';
  if (path.includes('/change-password')) return 'CHANGE_PASSWORD';

  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    case 'GET': return 'READ';
    default: return method;
  }
}

function getResource(path) {
  if (path.includes('/users')) return 'USER';
  if (path.includes('/condominiums')) return 'CONDOMINIUM';
  if (path.includes('/units')) return 'UNIT';
  if (path.includes('/residents')) return 'RESIDENT';
  if (path.includes('/flows')) return 'FLOW';
  if (path.includes('/calls')) return 'CALL';
  if (path.includes('/auth')) return 'AUTH';
  if (path.includes('/audit')) return 'AUDIT';

  return 'UNKNOWN';
}

function getResourceId(req) {
  return req.params.id || req.params.condominiumId || req.params.unitId || req.params.residentId || req.params.flowId || req.params.stepId || req.body.id || null;
}

function getErrorMessage(data) {
  try {
    const parsed = JSON.parse(data);
    return parsed.error || parsed.message || null;
  } catch {
    return null;
  }
}

module.exports = auditMiddleware;
