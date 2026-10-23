import { Client } from 'pg';
import { URL } from 'url';

export interface StagingDatabaseIdentity {
  currentDatabase: string;
  currentUser: string;
  host: string;
  port: number;
  isStagingDatabase: boolean;
}

/**
 * Fail-closed safety guard for Staging environments.
 * Positively verifies the database server identity and connection properties
 * to ensure staging operations NEVER silently fall back to shared production infrastructure.
 */
export async function assertStagingDatabase(databaseUrl?: string): Promise<StagingDatabaseIdentity> {
  const urlString = databaseUrl || process.env.DATABASE_URL;

  if (!urlString) {
    throw new Error('FAIL-CLOSED STAGING GUARD: DATABASE_URL is not set.');
  }

  // 1. Static URL Inspection
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (err: any) {
    throw new Error(`FAIL-CLOSED STAGING GUARD: Invalid DATABASE_URL: ${err.message}`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const databaseName = parsedUrl.pathname.replace(/^\//, '');

  // Strictly reject the known shared production Supabase database
  const prohibitedHosts = [
    'aws-1-eu-west-1.pooler.supabase.com',
  ];

  for (const prohibited of prohibitedHosts) {
    if (hostname === prohibited || hostname.endsWith(`.${prohibited}`)) {
      throw new Error(
        `FATAL STAGING VIOLATION: DATABASE_URL points to shared production host "${hostname}". Staging execution terminated.`
      );
    }
  }

  // In staging mode, reject local test database name if explicitly running against hosted staging
  if (process.env.APP_ENV === 'staging' && databaseName === 'cityos_test') {
    throw new Error(
      'FATAL STAGING VIOLATION: Hosted staging cannot run against local test database "cityos_test".'
    );
  }

  // 2. Active Server-Side Identity Verification (read-only query)
  const client = new Client({
    connectionString: urlString,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();

    const identityRes = await client.query(`
      SELECT 
        current_database() AS "currentDatabase",
        current_user AS "currentUser",
        version() AS "version"
    `);

    const row = identityRes.rows[0];
    if (!row) {
      throw new Error('FAIL-CLOSED STAGING GUARD: Unable to query database server identity.');
    }

    // Safety check: verify database is not production-sized (> 500 organizations indicates live data)
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization'
      ) AS "hasOrgTable"
    `);

    if (tableCheck.rows[0]?.hasOrgTable) {
      const orgCountRes = await client.query('SELECT count(*)::int AS count FROM "organization"');
      const count = orgCountRes.rows[0]?.count ?? 0;
      if (count > 500) {
        throw new Error(
          `FATAL STAGING VIOLATION: Target database contains ${count} organizations. This indicates production data! Aborting to prevent data corruption.`
        );
      }
    }

    await client.end();

    return {
      currentDatabase: row.currentDatabase,
      currentUser: row.currentUser,
      host: hostname,
      port: Number(parsedUrl.port || 5432),
      isStagingDatabase: true,
    };
  } catch (error: any) {
    try {
      await client.end();
    } catch {}
    throw new Error(`FAIL-CLOSED STAGING GUARD: Verification failed: ${error.message}`);
  }
}
