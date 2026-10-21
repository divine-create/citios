#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/110908f680701d91e57d2acb75d0984494451508dcb20065e83ea90489cabe12/contract';
import endContract from '../../snapshots/110908f680701d91e57d2acb75d0984494451508dcb20065e83ea90489cabe12/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/14d8b0318f81cae0c530c1f4c5a7b59d97db7821dee970562946646d1f865ce5/contract';
import startContract from '../../snapshots/14d8b0318f81cae0c530c1f4c5a7b59d97db7821dee970562946646d1f865ce5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'commentLike',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('commentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('personId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'commentLike',
        constraint: 'commentLike_commentId_personId_key',
        columns: ['commentId', 'personId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'commentLike',
        index: 'commentLike_commentId_idx',
        columns: ['commentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'commentLike',
        index: 'commentLike_personId_idx',
        columns: ['personId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'commentLike',
        foreignKey: {
          name: 'commentLike_commentId_fkey',
          columns: ['commentId'],
          references: { schema: 'public', table: 'comment', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'commentLike',
        foreignKey: {
          name: 'commentLike_personId_fkey',
          columns: ['personId'],
          references: { schema: 'public', table: 'person', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
