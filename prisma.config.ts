import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';
import pgvector from '@prisma/orm-extension-pgvector/control';

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    extensions: [pgvector],
    db: {
      // Use the direct (non-pooled) connection for migrations/DDL so that
      // long-running CREATE TABLE batches don't time out through PgBouncer.
      connection: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL']!,
    },
  }),
});
