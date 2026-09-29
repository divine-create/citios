import 'dotenv/config';
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
