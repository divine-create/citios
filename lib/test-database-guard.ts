import { Client } from 'pg';
import { URL } from 'url';

export interface DatabaseIdentity {
  currentDatabase: string;
  currentUser: string;
  host: string;
  port: number;
  isIsolatedTestDatabase: boolean;
}

/**
 * Fail-closed database safety guard.
 * Positively verifies the database server identity and connection properties
 * to ensure database-mutating operations NEVER execute against shared or production infrastructure.
 */
export async function assertIsolatedTestDatabase(databaseUrl?: string): Promise<DatabaseIdentity> {
  const urlString = databaseUrl || process.env.DATABASE_URL;

  if (!urlString) {
    throw new Error('FAIL-CLOSED SAFETY GUARD: DATABASE_URL is not set.');
  }

  // 1. Static URL Inspection
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (err: any) {
    throw new Error(`FAIL-CLOSED SAFETY GUARD: Invalid DATABASE_URL: ${err.message}`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const databaseName = parsedUrl.pathname.replace(/^\//, '');

  // Reject any remote hosts, cloud providers, or known production endpoints
  const prohibitedHosts = ['supabase.com', 'pooler.supabase.com', 'aws', 'amazonaws.com', 'azure.com', 'render.com', 'neon.tech'];
  for (const prohibited of prohibitedHosts) {
    if (hostname.includes(prohibited)) {
      throw new Error(
        `FATAL SAFETY VIOLATION: DATABASE_URL points to prohibited remote/production host "${hostname}". Execution terminated.`
      );
    }
  }

  // Positively verify that the host is strictly local
  const allowedHosts = ['127.0.0.1', 'localhost', '::1'];
  if (!allowedHosts.includes(hostname)) {
    throw new Error(
      `FATAL SAFETY VIOLATION: Database host "${hostname}" is not an approved local test target. Only local loopback (127.0.0.1 / localhost) is permitted.`
    );
  }

  // Positively verify that the database name matches the designated test target
  if (databaseName !== 'cityos_test') {
    throw new Error(
      `FATAL SAFETY VIOLATION: Database name "${databaseName}" is not the isolated test database "cityos_test". Refusing to proceed.`
    );
  }

  // 2. Active Server-Side Identity Verification (read-only query)
  const client = new Client({ connectionString: urlString });
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
      throw new Error('FAIL-CLOSED SAFETY GUARD: Unable to query database server identity.');
    }

    if (row.currentDatabase !== 'cityos_test') {
      throw new Error(
        `FATAL SAFETY VIOLATION: Connected server reports database "${row.currentDatabase}", expected "cityos_test".`
      );
    }

    if (row.currentUser !== 'testuser') {
      throw new Error(
        `FATAL SAFETY VIOLATION: Connected user is "${row.currentUser}", expected "testuser".`
      );
    }

    // Check if tables exist and verify organization count is not production-sized
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
          `FATAL SAFETY VIOLATION: Database contains ${count} organizations. This resembles production data! Refusing mutation.`
        );
      }
    }

    await client.end();

    return {
      currentDatabase: row.currentDatabase,
      currentUser: row.currentUser,
      host: hostname,
      port: Number(parsedUrl.port || 5432),
      isIsolatedTestDatabase: true,
    };
  } catch (error: any) {
    try {
      await client.end();
    } catch {}
    throw new Error(`FAIL-CLOSED SAFETY GUARD: Verification failed: ${error.message}`);
  }
}
