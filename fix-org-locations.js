import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

// Find all organizations of type 'RESTAURANT' that have no locations
const res = await client.query(`
  SELECT id, address FROM "organization" 
  WHERE type = 'RESTAURANT' 
  AND id NOT IN (SELECT "organizationId" FROM "location")
`);

for (const org of res.rows) {
  console.log(`Fixing missing location for org: ${org.id}`);
  
  // Create a default location
  const locRes = await client.query(`
    INSERT INTO "location" ("id", "organizationId", "name", "address", "isHQ", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, 'Main Branch', $2, true, NOW(), NOW())
    RETURNING id
  `, [org.id, org.address]);
  
  const locId = locRes.rows[0].id;
  
  // Link all memberships for this org to this location
  const mems = await client.query(`SELECT id FROM "membership" WHERE "organizationId" = $1`, [org.id]);
  for (const mem of mems.rows) {
    await client.query(`
      INSERT INTO "membershipLocation" ("membershipId", "locationId")
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [mem.id, locId]);
  }
}

console.log('Done fixing locations!');
await client.end();
