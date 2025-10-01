-- Create admin superuser for local development
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = 'admin'
  ) THEN
    CREATE ROLE admin WITH LOGIN PASSWORD 'admin!!' SUPERUSER CREATEDB CREATEROLE;
    RAISE NOTICE 'Created role admin with superuser privileges.';
  ELSE
    RAISE NOTICE 'Role admin already exists. Skipping.';
  END IF;
END
$$;

