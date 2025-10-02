const { PrismaClient } = require('@prisma/client');
const c = new PrismaClient();
console.log(Object.keys(c).sort());
