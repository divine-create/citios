#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5cbff7ae6f7c27ba81a3871e4be6d91109410dc3f334e055f63aebc70a037634/contract';
import startContract from '../../snapshots/5cbff7ae6f7c27ba81a3871e4be6d91109410dc3f334e055f63aebc70a037634/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b05874b775deb61fcb9c4273184527f26e18bee14189ea1280163736b4c79c5b/contract';
import endContract from '../../snapshots/b05874b775deb61fcb9c4273184527f26e18bee14189ea1280163736b4c79c5b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'inventoryItem',
        columns: [
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('parLevel', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('quantityOnHand', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'inventoryItem_category_check_12fc6fdb',
            "\"category\" IN ('HOUSEKEEPING', 'FOOD_AND_BEVERAGE', 'MAINTENANCE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'rateRule',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('multiplier', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'rateRule_type_check_fe6cb8f7',
            "\"type\" IN ('WEEKEND_SURGE', 'HOLIDAY_SURGE')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'hotelRoom',
        column: col('baseRate', 'float8', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/float8@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'reservation',
        column: col('paymentStatus', 'text', {
          notNull: true,
          default: lit('PENDING'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'reservation',
        column: col('totalPrice', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'rateRule',
        constraint: 'rateRule_organizationId_type_key',
        columns: ['organizationId', 'type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventoryItem',
        index: 'inventoryItem_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'rateRule',
        index: 'rateRule_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventoryItem',
        foreignKey: {
          name: 'inventoryItem_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'rateRule',
        foreignKey: {
          name: 'rateRule_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
