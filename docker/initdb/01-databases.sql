-- Runs once, only when the Postgres data directory is first initialised.
-- The primary database (goldenaura) is created by POSTGRES_DB; these are the
-- extra databases the toolchain expects.
SELECT 'CREATE DATABASE goldenaura_shadow'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'goldenaura_shadow')\gexec
SELECT 'CREATE DATABASE goldenaura_test'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'goldenaura_test')\gexec

-- Make the vector extension available in every database on this instance.
\connect goldenaura
CREATE EXTENSION IF NOT EXISTS vector;
\connect goldenaura_test
CREATE EXTENSION IF NOT EXISTS vector;
