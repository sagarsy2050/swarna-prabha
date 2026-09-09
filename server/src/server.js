import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Swarna Prabha API listening on http://0.0.0.0:${config.port} (${config.env})`);
});

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });
  // Force-exit if connections linger.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', reason));

export default server;
