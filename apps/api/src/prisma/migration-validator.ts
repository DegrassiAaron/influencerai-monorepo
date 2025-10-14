import fs from 'node:fs';
import path from 'node:path';

export interface MigrationValidationResult {
  hasTenantTable: boolean;
  hasInfluencerTable: boolean;
  hasDatasetTable: boolean;
  hasJobTable: boolean;
  hasAssetTable: boolean;
  jobTableIncludesTenantId: boolean;
  jobStatusEnumCreated: boolean;
}

const INIT_SUFFIX = '_init';
const DEFAULT_MIGRATION_FILE = 'migration.sql';

export interface ReadInitialMigrationOptions {
  migrationsDirectory?: string;
  migrationFileName?: string;
}

export function resolveMigrationsDirectory(): string {
  return path.resolve(__dirname, '../../prisma/migrations');
}

export function getInitialMigrationPath(options?: ReadInitialMigrationOptions): string {
  const migrationsDir = options?.migrationsDirectory ?? resolveMigrationsDirectory();
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Prisma migrations directory not found at ${migrationsDir}`);
  }

  const initDirectories = fs
    .readdirSync(migrationsDir)
    .filter((entry) => entry.includes(INIT_SUFFIX))
    .map((entry) => path.join(migrationsDir, entry))
    .filter((entryPath) => fs.statSync(entryPath).isDirectory())
    .sort();

  if (initDirectories.length === 0) {
    throw new Error(`No initial Prisma migration found inside ${migrationsDir}`);
  }

  const migrationFile = options?.migrationFileName ?? DEFAULT_MIGRATION_FILE;
  const migrationPath = path.join(initDirectories[0], migrationFile);

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Initial migration file ${migrationFile} not found at ${migrationPath}`);
  }

  return migrationPath;
}

export function readInitialMigrationSql(options?: ReadInitialMigrationOptions): string {
  const migrationPath = getInitialMigrationPath(options);
  return fs.readFileSync(migrationPath, 'utf8');
}

export function validateInitialMigration(sql: string): MigrationValidationResult {
  const normalizedSql = sql.replace(/\s+/g, ' ').toLowerCase();

  const hasTable = (tableName: string): boolean =>
    normalizedSql.includes(`create table "${tableName.toLowerCase()}"`);

  const jobTableMatch = sql.match(/CREATE TABLE "Job"[\s\S]*?;/i);
  const jobTableIncludesTenantId = jobTableMatch
    ? /"tenantId"\s+TEXT\s+NOT\s+NULL/i.test(jobTableMatch[0])
    : false;

  const jobStatusEnumCreated = /CREATE TYPE "JobStatus"/i.test(sql);

  return {
    hasTenantTable: hasTable('Tenant'),
    hasInfluencerTable: hasTable('Influencer'),
    hasDatasetTable: hasTable('Dataset'),
    hasJobTable: hasTable('Job'),
    hasAssetTable: hasTable('Asset'),
    jobTableIncludesTenantId,
    jobStatusEnumCreated,
  };
}
