#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5cbff7ae6f7c27ba81a3871e4be6d91109410dc3f334e055f63aebc70a037634/contract';
import endContract from '../../snapshots/5cbff7ae6f7c27ba81a3871e4be6d91109410dc3f334e055f63aebc70a037634/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fcde68f9f23f236bcca35299d44dac5c1ae632c4ea8a3e42e3536ba5ed25f8a9/contract';
import startContract from '../../snapshots/fcde68f9f23f236bcca35299d44dac5c1ae632c4ea8a3e42e3536ba5ed25f8a9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'city',
        columns: [
          col('country', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('USD'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timezone', 'text', {
            notNull: true,
            default: lit('UTC'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'organization',
        column: col('cityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'city',
        constraint: 'city_slug_key',
        columns: ['slug'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organization',
        index: 'organization_cityId_idx_1ab1b247',
        columns: ['cityId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organization',
        foreignKey: {
          name: 'organization_cityId_fkey',
          columns: ['cityId'],
          references: { schema: 'public', table: 'city', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
