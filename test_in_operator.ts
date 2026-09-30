import { db } from './src/prisma/db';
async function run() {
  const orgs = await db.orm.public.Organization.where({ type: 'RESTAURANT' }).all();
  console.log('Total Restaurants:', orgs.length);

  const orgIdsWithLoc = orgs.map(o => o.id);
  // @ts-ignore
  const filtered = await db.orm.public.Organization.where({ id: { in: orgIdsWithLoc } }).all();
  console.log('Restaurants using { in }: ', filtered.length);
}
run();
