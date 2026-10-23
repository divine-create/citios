import dotenv from 'dotenv';
if (process.env.NODE_ENV === 'test' || process.env.CITYOS_ISOLATED_TEST === '1') {
  dotenv.config({ path: '.env.test', override: true });
} else if (process.env.APP_ENV === 'staging' || process.env.CITYOS_ENV === 'staging') {
  dotenv.config({ path: '.env.staging', override: true });
} else {
  dotenv.config();
}

// Anti-fallback guard for staging: strictly reject shared production Supabase database
if (process.env.APP_ENV === 'staging' || process.env.CITYOS_ENV === 'staging') {
  const dbUrl = process.env['DATABASE_URL'] || '';
  if (dbUrl.includes('aws-1-eu-west-1.pooler.supabase.com')) {
    throw new Error(
      'FATAL STAGING VIOLATION: Staging environment cannot connect to shared production Supabase pooler. Fallback prohibited.'
    );
  }
}

import * as Temporal from '@js-temporal/polyfill';
(globalThis as any).Temporal = Temporal.Temporal;
import postgres from '@prisma/orm-postgres/runtime';
import pgvector from '@prisma/orm-extension-pgvector/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
  extensions: [pgvector],
});
