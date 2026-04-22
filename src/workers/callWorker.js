const { callQueue } = require('../config/queue');
const callProcessor = require('../queues/callProcessor');
const logger = require('../config/logger');
const { callQueueConcurrency } = require('../config/env');

callQueue.process(callQueueConcurrency, callProcessor);

logger.info({ msg: `Call worker started (concurrency: ${callQueueConcurrency})` });

module.exports = callQueue;
