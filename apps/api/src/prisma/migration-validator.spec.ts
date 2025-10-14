import { readInitialMigrationSql, validateInitialMigration } from './migration-validator';

describe('Prisma initial migration', () => {
  it('includes schema-critical definitions for bootstrapping a fresh database', () => {
    const sql = readInitialMigrationSql();
    const result = validateInitialMigration(sql);

    expect(result).toMatchObject({
      hasTenantTable: true,
      hasInfluencerTable: true,
      hasDatasetTable: true,
      hasJobTable: true,
      hasAssetTable: true,
      jobTableIncludesTenantId: true,
      jobStatusEnumCreated: true,
    });
  });
});
