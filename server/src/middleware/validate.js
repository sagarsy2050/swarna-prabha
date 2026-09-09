import { ApiError } from '../utils/ApiError.js';

/**
 * validate({ body, query, params }) — each value is a Zod schema. Parsed output
 * replaces the raw input so downstream code gets coerced, trimmed, typed data.
 */
export function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      for (const key of ['body', 'query', 'params']) {
        if (!schemas[key]) continue;
        const result = schemas[key].safeParse(req[key]);
        if (!result.success) {
          return next(
            ApiError.unprocessable('Validation failed', {
              code: 'VALIDATION',
              details: result.error.issues.map((i) => ({
                path: [key, ...i.path].join('.'),
                message: i.message,
              })),
            }),
          );
        }
        // req.query/params are read-only getters on newer Express; assign fields.
        if (key === 'body') req.body = result.data;
        else Object.assign(req[key], result.data);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default validate;
