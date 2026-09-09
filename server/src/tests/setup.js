// Vitest global setup. Establishes a deterministic test environment BEFORE any
// module that reads config is imported.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-000';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-000';
process.env.JWT_ACCESS_TTL ||= '15m';
process.env.JWT_REFRESH_TTL ||= '7d';
process.env.PAYMENT_DRIVER ||= 'manual';
process.env.MAIL_DRIVER = 'console';
process.env.STORAGE_DRIVER ||= 'local';
process.env.UPLOAD_DIR ||= './uploads-test';
process.env.CORS_ORIGIN ||= 'http://localhost:5173';
// Integration tests use this DB; if unreachable they skip themselves.
process.env.DATABASE_URL ||=
  'postgresql://goldenaura:goldenaura@localhost:5434/goldenaura_test?schema=public';
