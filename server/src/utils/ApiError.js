/** Error carrying an HTTP status + machine code. Thrown anywhere, handled centrally. */
export class ApiError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || httpCode(status);
    this.details = details;
    this.expose = true;
  }

  static badRequest(msg = 'Bad request', opts) {
    return new ApiError(400, msg, opts);
  }
  static unauthorized(msg = 'Authentication required', opts) {
    return new ApiError(401, msg, opts);
  }
  static forbidden(msg = 'Not allowed', opts) {
    return new ApiError(403, msg, opts);
  }
  static notFound(msg = 'Not found', opts) {
    return new ApiError(404, msg, opts);
  }
  static conflict(msg = 'Conflict', opts) {
    return new ApiError(409, msg, opts);
  }
  static unprocessable(msg = 'Unprocessable', opts) {
    return new ApiError(422, msg, opts);
  }
  static internal(msg = 'Internal error', opts) {
    return new ApiError(500, msg, opts);
  }
}

function httpCode(status) {
  return (
    {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE',
      500: 'INTERNAL',
      503: 'SERVICE_UNAVAILABLE',
    }[status] || 'ERROR'
  );
}

export default ApiError;
