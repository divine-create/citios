import dotenv from 'dotenv';
import { assertIsolatedTestDatabase } from './test-database-guard';

// 1. Force-load .env.test with override: true to prevent any fallback to .env or production variables
dotenv.config({ path: '.env.test', override: true });

// 2. Execute fail-closed active database verification before any test suite or ORM module can query
await assertIsolatedTestDatabase(process.env.DATABASE_URL);
