const Queue = require('bull');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  },
  removeOnComplete: true,
  removeOnFail: true,
  timeout: 300000
};

const callQueue = new Queue('call-processing', REDIS_URL, {
  defaultJobOptions,
  settings: {
    stalledInterval: 300000,
    maxStalledCount: 2
  }
});

logger.info({ msg: 'Call queue initialized' });

[callQueue].forEach(queue => {
  queue.on('failed', (job, err) => {
    console.log('\n========== [JOB FAILED] ==========');
    logger.error({ msg: `Job failed [${queue.name}]`, jobId: job.id, attempt: job.attemptsMade, error: err.message });
  });

  queue.on('completed', (job) => {
    console.log('\n========== [JOB COMPLETED] ==========');
    logger.info({ msg: `Job completed [${queue.name}]`, jobId: job.id });
  });

  queue.on('stalled', (jobId) => {
    console.log('\n========== [JOB STALLED] ==========');
    logger.warn({ msg: `Job stalled [${queue.name}]`, jobId });
  });
});

module.exports = { callQueue };
