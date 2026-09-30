const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.city.findMany().then(console.log).catch(console.error);
