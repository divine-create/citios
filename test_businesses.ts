import { db } from './src/prisma/db';

async function run() {
  const orgs = await db.orm.public.Organization.all();
  
  const counts = orgs.reduce((acc: any, org: any) => {
    acc[org.type] = (acc[org.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('--- Organization Types ---');
  for (const [type, count] of Object.entries(counts)) {
    console.log(`${type}: ${count}`);
  }
  
  console.log('\n--- Sample Businesses (First 10) ---');
  orgs.slice(0, 10).forEach((org: any) => {
    console.log(`- ${org.name} [${org.type}] | ${org.description ? org.description.substring(0, 60) + '...' : 'No description'}`);
  });
}
run();
