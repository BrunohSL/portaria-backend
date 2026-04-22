function requestTimeout(timeoutMs = 30000) {
  return (req, res, next) => {
    const isLongRunning = req.path.includes('/webhook') || req.path.includes('/calls');
    const timeout = isLongRunning ? 60000 : timeoutMs;

    req.setTimeout(timeout, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          correlationId: req.correlationId
        });
      }
    });

    next();
  };
}

module.exports = requestTimeout;
