import { config } from '../config/index.js';

/** Minimal structured-ish logger. Swap for pino/winston later without touching callers. */
const ts = () => new Date().toISOString();

function emit(level, args) {
  if (config.isTest && level === 'info') return;
  console[level === 'debug' ? 'log' : level](`[${ts()}] ${level.toUpperCase()}`, ...args);
}

export const logger = {
  debug: (...a) => !config.isProd && emit('debug', a),
  info: (...a) => emit('info', a),
  warn: (...a) => emit('warn', a),
  error: (...a) => emit('error', a),
};

export default logger;
