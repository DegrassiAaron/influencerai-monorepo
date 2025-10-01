import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenantName = process.env.SEED_TENANT_NAME || 'Acme Inc';
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@acme.test';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant_dev_1' },
    create: { id: 'tenant_dev_1', name: tenantName },
    update: { name: tenantName },
  });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash: hash, role: 'admin', tenantId: tenant.id },
    update: { tenantId: tenant.id },
  });

  console.log('Seed complete:', { tenantId: tenant.id, email });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

