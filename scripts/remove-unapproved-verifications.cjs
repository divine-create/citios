const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DIRECT_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('Querying discoveryListing records...');
  const res = await client.query('SELECT id, "organizationId", metadata FROM "discoveryListing"');
  console.log(`Found ${res.rows.length} total listings.`);

  let updatedCount = 0;
  for (const row of res.rows) {
    if (!row.metadata) continue;
    let meta = {};
    try {
      meta = JSON.parse(row.metadata);
    } catch {
      continue;
    }

    if (meta.isVerified) {
      delete meta.isVerified;
      const updatedMetadata = JSON.stringify(meta);
      await client.query(
        'UPDATE "discoveryListing" SET metadata = $1 WHERE id = $2',
        [updatedMetadata, row.id]
      );
      updatedCount++;
      console.log(`Removed isVerified from listing ${row.id} (orgId: ${row.organizationId})`);
    }
  }

  console.log(`Successfully removed unapproved isVerified from ${updatedCount} listings.`);
  await client.end();
}

main().catch(console.error);
