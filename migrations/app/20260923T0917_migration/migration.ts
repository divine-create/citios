#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0968625fce39750630a94ce373d0e8154c4a77be9d755a85d92fc5ef11a0cad8/contract';
import endContract from '../../snapshots/0968625fce39750630a94ce373d0e8154c4a77be9d755a85d92fc5ef11a0cad8/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/59e754883a10d22e265556b097cc63320361c29cd0436330a6cbbc0f4f973105/contract';
import startContract from '../../snapshots/59e754883a10d22e265556b097cc63320361c29cd0436330a6cbbc0f4f973105/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'retailPurchaseOrderItem',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('orderedQty', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('poId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('receivedQty', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('totalCost', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('unitCost', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'attendance',
        column: col('organizationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'grade',
        column: col('organizationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'gradebook',
        column: col('organizationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'hotelRoom',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'inventoryItem',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'maintenanceTicket',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'membership',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'menuItem',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'outlet',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'payment',
        column: col('refundedAmount', 'float8', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/float8@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'reservation',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantExpense',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantInventoryItem',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantOrder',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantReservation',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantTable',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'retailOrder',
        column: col('deliveryAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'retailOrder',
        column: col('fulfillmentStatus', 'text', {
          notNull: true,
          default: lit('UNFULFILLED'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'retailPurchaseOrder',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'retailPurchaseOrder',
        column: col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'roomBlock',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.setDefault({
        schema: 'public',
        table: 'retailOrder',
        column: 'status',
        defaultSql: "DEFAULT 'PENDING'",
        operationClass: 'widening',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'retailOrder',
        constraint: 'retailOrder_fulfillmentStatus_check_9e0c64a9',
        expression:
          "\"fulfillmentStatus\" IN ('UNFULFILLED', 'PROCESSING', 'READY', 'FULFILLED', 'CANCELLED', 'RETURNED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'retailOrder',
        constraint: 'retailOrder_status_check_647f5b5d',
        expression: "\"status\" IN ('PENDING', 'CONFIRMED', 'CANCELLED')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'menuItem',
        index: 'menuItem_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantExpense',
        index: 'restaurantExpense_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantInventoryItem',
        index: 'restaurantInventoryItem_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantOrder',
        index: 'restaurantOrder_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantReservation',
        index: 'restaurantReservation_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantTable',
        index: 'restaurantTable_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'retailPurchaseOrder',
        index: 'retailPurchaseOrder_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'retailPurchaseOrderItem',
        index: 'retailPurchaseOrderItem_poId_idx_f6a16692',
        columns: ['poId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'retailPurchaseOrderItem',
        index: 'retailPurchaseOrderItem_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'menuItem',
        foreignKey: {
          name: 'menuItem_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantExpense',
        foreignKey: {
          name: 'restaurantExpense_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantInventoryItem',
        foreignKey: {
          name: 'restaurantInventoryItem_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantOrder',
        foreignKey: {
          name: 'restaurantOrder_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantReservation',
        foreignKey: {
          name: 'restaurantReservation_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantTable',
        foreignKey: {
          name: 'restaurantTable_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'retailPurchaseOrder',
        foreignKey: {
          name: 'retailPurchaseOrder_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'retailPurchaseOrderItem',
        foreignKey: {
          name: 'retailPurchaseOrderItem_poId_fkey',
          columns: ['poId'],
          references: { schema: 'public', table: 'retailPurchaseOrder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'retailPurchaseOrderItem',
        foreignKey: {
          name: 'retailPurchaseOrderItem_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'retailProduct', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
