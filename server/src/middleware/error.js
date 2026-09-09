import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';

export function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let body = { message: 'Internal server error', code: 'INTERNAL' };

  if (err instanceof ApiError) {
    status = err.status;
    body = { message: err.message, code: err.code, details: err.details };
  } else if (err instanceof ZodError) {
    status = 422;
    body = {
      message: 'Validation failed',
      code: 'VALIDATION',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      body = { message: `Duplicate value for ${err.meta?.target}`, code: 'DUPLICATE' };
    } else if (err.code === 'P2025') {
      status = 404;
      body = { message: 'Record not found', code: 'NOT_FOUND' };
    } else if (err.code === 'P2003') {
      status = 400;
      body = { message: 'Related record missing or still referenced', code: 'FK_CONSTRAINT' };
    } else {
      status = 400;
      body = { message: 'Database request error', code: err.code };
    }
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    body = { message: 'Malformed JSON body', code: 'BAD_JSON' };
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    body = { message: 'Uploaded file is too large', code: 'FILE_TOO_LARGE' };
  }

  if (status >= 500) {
    logger.error(err.stack || err);
    if (!config.isProd && err.message) body.message = err.message;
  }

  res.status(status).json({ error: body });
}

export default { notFound, errorHandler };
