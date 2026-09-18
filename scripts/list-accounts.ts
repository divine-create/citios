// Lists all EMAIL identifiers (demo accounts) in the database. Read-only.
import { db } from '../src/prisma/db.js';

async function main() {
  const idents = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL' }).all();
  for (const i of idents) {
    console.log(`${i.normalizedValue}  verified=${i.isVerified}`);
  }
  console.log(`TOTAL: ${idents.length}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
