import 'dotenv/config';
import pg from 'pg';

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.log('No DATABASE_URL configured, skipping DB migration script.');
  process.exit(0);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to database for passwordResetToken migration.');

  const queries = [
    `CREATE TABLE IF NOT EXISTS "passwordResetToken" (
      "id" TEXT PRIMARY KEY,
      "personId" TEXT NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "email" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "usedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS "passwordResetToken_tokenHash_idx" ON "passwordResetToken"("tokenHash");`,
    `CREATE INDEX IF NOT EXISTS "passwordResetToken_personId_expiresAt_idx" ON "passwordResetToken"("personId", "expiresAt");`,
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log('Executed:', q.trim().split('\n')[0]);
    } catch (e) {
      console.error('Error running:', q, e.message);
    }
  }

  await client.end();
  console.log('passwordResetToken migration complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
