#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/12882941978a8c5084baccbdcae43de73fb448d5ccf1ab59b2625b1431d5d1ab/contract';
import startContract from '../../snapshots/12882941978a8c5084baccbdcae43de73fb448d5ccf1ab59b2625b1431d5d1ab/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/14d8b0318f81cae0c530c1f4c5a7b59d97db7821dee970562946646d1f865ce5/contract';
import endContract from '../../snapshots/14d8b0318f81cae0c530c1f4c5a7b59d97db7821dee970562946646d1f865ce5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'voiceMemory',
        columns: [
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('confidence', 'float8', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('personId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('VOICE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'voiceReminder',
        columns: [
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('dueAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('entityReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('personId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('VOICE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'deliveryJob',
        column: col('retailOrderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'residentProfile',
        column: col('defaultDeliveryAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'deliveryJob',
        constraint: 'deliveryJob_retailOrderId_key',
        columns: ['retailOrderId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'voiceMemory',
        constraint: 'voiceMemory_personId_category_key_key',
        columns: ['personId', 'category', 'key'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'voiceMemory',
        index: 'voiceMemory_personId_idx_e5e06b80',
        columns: ['personId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'voiceReminder',
        index: 'voiceReminder_personId_idx_e5e06b80',
        columns: ['personId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'deliveryJob',
        foreignKey: {
          name: 'deliveryJob_retailOrderId_fkey',
          columns: ['retailOrderId'],
          references: { schema: 'public', table: 'retailOrder', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'voiceMemory',
        foreignKey: {
          name: 'voiceMemory_personId_fkey',
          columns: ['personId'],
          references: { schema: 'public', table: 'person', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'voiceReminder',
        foreignKey: {
          name: 'voiceReminder_personId_fkey',
          columns: ['personId'],
          references: { schema: 'public', table: 'person', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
