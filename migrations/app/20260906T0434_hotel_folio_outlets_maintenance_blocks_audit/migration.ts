#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a09228b262ff3d1d70ce1dc7283d2d8017e415fa5e792f611b8866c03c72a9d1/contract';
import endContract from '../../snapshots/a09228b262ff3d1d70ce1dc7283d2d8017e415fa5e792f611b8866c03c72a9d1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b05874b775deb61fcb9c4273184527f26e18bee14189ea1280163736b4c79c5b/contract';
import startContract from '../../snapshots/b05874b775deb61fcb9c4273184527f26e18bee14189ea1280163736b4c79c5b/contract.json' with { type: 'json' };
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
        table: 'folioCharge',
        columns: [
          col('amount', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('category', 'text', {
            notNull: true,
            default: lit('OTHER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reservationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'folioCharge_category_check_822f7f6b',
            "\"category\" IN ('ROOM', 'FOOD_AND_BEVERAGE', 'SPA', 'OTHER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'maintenanceTicket',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priority', 'text', {
            notNull: true,
            default: lit('MEDIUM'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('resolvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('roomId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'maintenanceTicket_priority_check_759b7c5e',
            "\"priority\" IN ('LOW', 'MEDIUM', 'HIGH')",
          ),
          checkExpression(
            'maintenanceTicket_status_check_91a6794e',
            "\"status\" IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'nightAuditReport',
        columns: [
          col('auditDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fnbRevenue', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('occupancyRate', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('otherRevenue', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('roomRevenue', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('roomsSold', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('totalRevenue', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'outlet',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'outlet_type_check_d6a6d7f4',
            "\"type\" IN ('RESTAURANT', 'BAR', 'CLUB', 'SPA')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'outletItem',
        columns: [
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('outletId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'outletOrder',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('outletId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reservationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tabName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'outletOrder_status_check_7d6b94c9',
            "\"status\" IN ('OPEN', 'PAID', 'CHARGED_TO_ROOM')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'outletOrderItem',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('outletItemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('outletOrderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'roomBlock',
        columns: [
          col('checkInDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('checkOutDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('groupName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'reservation',
        column: col('roomBlockId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'nightAuditReport',
        constraint: 'nightAuditReport_organizationId_auditDate_key',
        columns: ['organizationId', 'auditDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folioCharge',
        index: 'folioCharge_reservationId_idx_868923bb',
        columns: ['reservationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'maintenanceTicket',
        index: 'maintenanceTicket_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'maintenanceTicket',
        index: 'maintenanceTicket_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'nightAuditReport',
        index: 'nightAuditReport_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outlet',
        index: 'outlet_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outletItem',
        index: 'outletItem_outletId_idx_c4b25445',
        columns: ['outletId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outletOrder',
        index: 'outletOrder_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outletOrder',
        index: 'outletOrder_outletId_idx_c4b25445',
        columns: ['outletId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outletOrder',
        index: 'outletOrder_reservationId_idx_868923bb',
        columns: ['reservationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outletOrderItem',
        index: 'outletOrderItem_outletItemId_idx_f0698039',
        columns: ['outletItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outletOrderItem',
        index: 'outletOrderItem_outletOrderId_idx_8a0d9c99',
        columns: ['outletOrderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reservation',
        index: 'reservation_roomBlockId_idx_f61294ed',
        columns: ['roomBlockId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roomBlock',
        index: 'roomBlock_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folioCharge',
        foreignKey: {
          name: 'folioCharge_reservationId_fkey',
          columns: ['reservationId'],
          references: { schema: 'public', table: 'reservation', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'maintenanceTicket',
        foreignKey: {
          name: 'maintenanceTicket_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'maintenanceTicket',
        foreignKey: {
          name: 'maintenanceTicket_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'hotelRoom', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'nightAuditReport',
        foreignKey: {
          name: 'nightAuditReport_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'outlet',
        foreignKey: {
          name: 'outlet_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'outletItem',
        foreignKey: {
          name: 'outletItem_outletId_fkey',
          columns: ['outletId'],
          references: { schema: 'public', table: 'outlet', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'outletOrder',
        foreignKey: {
          name: 'outletOrder_outletId_fkey',
          columns: ['outletId'],
          references: { schema: 'public', table: 'outlet', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'outletOrder',
        foreignKey: {
          name: 'outletOrder_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'outletOrder',
        foreignKey: {
          name: 'outletOrder_reservationId_fkey',
          columns: ['reservationId'],
          references: { schema: 'public', table: 'reservation', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'outletOrderItem',
        foreignKey: {
          name: 'outletOrderItem_outletOrderId_fkey',
          columns: ['outletOrderId'],
          references: { schema: 'public', table: 'outletOrder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'outletOrderItem',
        foreignKey: {
          name: 'outletOrderItem_outletItemId_fkey',
          columns: ['outletItemId'],
          references: { schema: 'public', table: 'outletItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roomBlock',
        foreignKey: {
          name: 'roomBlock_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reservation',
        foreignKey: {
          name: 'reservation_roomBlockId_fkey',
          columns: ['roomBlockId'],
          references: { schema: 'public', table: 'roomBlock', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
