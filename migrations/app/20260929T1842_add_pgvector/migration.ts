#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0968625fce39750630a94ce373d0e8154c4a77be9d755a85d92fc5ef11a0cad8/contract';
import startContract from '../../snapshots/0968625fce39750630a94ce373d0e8154c4a77be9d755a85d92fc5ef11a0cad8/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/12882941978a8c5084baccbdcae43de73fb448d5ccf1ab59b2625b1431d5d1ab/contract';
import endContract from '../../snapshots/12882941978a8c5084baccbdcae43de73fb448d5ccf1ab59b2625b1431d5d1ab/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  placeholder,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'hQAuditEvent',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorPersonId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('targetId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'measurementEvent',
        columns: [
          col('entityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('occurredAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('organizationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('personId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('vertical', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'menuItemModifierGroup',
        columns: [
          col('displayOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('menuItemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('modifierGroupId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'modifierGroup',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('displayOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isRequired', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('maxSelections', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('minSelections', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'modifierOption',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('displayOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inventoryItemId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('inventoryQuantity', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('modifierGroupId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priceDelta', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'orderItemModifier',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('modifierOptionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('orderItemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priceDelta', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'restaurantProductionRun',
        columns: [
          col('actualYield', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('batchMultiplier', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expectedYield', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recipeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recordedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('COMPLETED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('totalCost', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'restaurantRecipe',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('instructions', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('menuItemId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('yieldQuantity', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'restaurantRecipeIngredient',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('itemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('recipeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'restaurantShift',
        columns: [
          col('actualCash', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('closedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('closedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expectedCash', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('openedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('openedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openingFloat', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('variance', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'voiceCart',
        columns: [
          col('citySlug', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('personId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'voiceCartItem',
        columns: [
          col('cartId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('menuItemId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('retailProductId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'voiceCheckout',
        columns: [
          col('cartId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idempotencyKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalAmount', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'voiceContext',
        columns: [
          col('data', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('personId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'menuItem',
        column: col('embedding', 'vector(768)', {
          codecRef: { codecId: 'pg/vector@1', typeParams: { length: 768 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'menuItem',
        column: col('inventoryItemId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'menuItem',
        column: col('kitchenStation', 'text', {
          default: lit('Main Kitchen'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orderItem',
        column: col('kitchenStatus', 'text', {
          notNull: true,
          default: lit('PENDING'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orderItem',
        column: col('menuItemName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orderItem',
        column: col('unitCost', 'float8', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/float8@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orderItem',
        column: col('variantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orderItem',
        column: col('variantName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'organization',
        column: col('embedding', 'vector(768)', {
          codecRef: { codecId: 'pg/vector@1', typeParams: { length: 768 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'organization',
        column: col('status', 'text', {
          notNull: true,
          default: lit('ACTIVE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'person',
        column: col('isSystemAdmin', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantInventoryItem',
        column: col('recipeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantInventoryItem',
        column: col('type', 'text', {
          notNull: true,
          default: lit('RAW_MATERIAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantOrder',
        column: col('inventoryConsumed', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantOrder',
        column: col('kitchenCompletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantOrder',
        column: col('kitchenStartedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantOrder',
        column: col('paymentStatus', 'text', {
          notNull: true,
          default: lit('PENDING'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantOrder',
        column: col('shiftId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantSettings',
        column: col('enableFoodCosting', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantSettings',
        column: col('enableInventory', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantSettings',
        column: col('enableModifiers', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantSettings',
        column: col('enableProduction', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantSettings',
        column: col('enableRecipes', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantSettings',
        column: col('enableVariants', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantStockMovement',
        column: col('type', 'text', {
          notNull: true,
          default: lit('MANUAL_ADJUSTMENT'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurantStockMovement',
        column: col('unitCost', 'float8', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/float8@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'retailProduct',
        column: col('embedding', 'vector(768)', {
          codecRef: { codecId: 'pg/vector@1', typeParams: { length: 768 } },
        }),
      }),
      this.dataTransform(endContract, 'handle-nulls-restaurantInventoryItem-cost', {
        check: () => placeholder('handle-nulls-restaurantInventoryItem-cost:check'),
        run: () => placeholder('handle-nulls-restaurantInventoryItem-cost:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'restaurantInventoryItem', column: 'cost' }),
      this.setDefault({
        schema: 'public',
        table: 'restaurantInventoryItem',
        column: 'cost',
        defaultSql: 'DEFAULT 0',
      }),
      this.addUnique({
        schema: 'public',
        table: 'menuItemModifierGroup',
        constraint: 'menuItemModifierGroup_menuItemId_modifierGroupId_key',
        columns: ['menuItemId', 'modifierGroupId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'orderItem',
        constraint: 'orderItem_kitchenStatus_check_cd0ddb0e',
        expression:
          "\"kitchenStatus\" IN ('PENDING', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'organization',
        constraint: 'organization_status_check_1527ac15',
        expression: "\"status\" IN ('ACTIVE', 'SUSPENDED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'restaurantInventoryItem',
        constraint: 'restaurantInventoryItem_type_check_d846b1ae',
        expression: "\"type\" IN ('RAW_MATERIAL', 'SUB_ASSEMBLY', 'FINISHED_GOOD')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'restaurantInventoryItem',
        constraint: 'restaurantInventoryItem_recipeId_key',
        columns: ['recipeId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'restaurantOrder',
        constraint: 'restaurantOrder_paymentStatus_check_8f21801a',
        expression:
          "\"paymentStatus\" IN ('INITIATED', 'PENDING', 'AUTHORIZED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'MANUAL_REFUND_NEEDED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'restaurantRecipe',
        constraint: 'restaurantRecipe_menuItemId_key',
        columns: ['menuItemId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'restaurantStockMovement',
        constraint: 'restaurantStockMovement_type_check_e8958272',
        expression:
          "\"type\" IN ('MANUAL_ADJUSTMENT', 'PURCHASE_RECEIPT', 'PRODUCTION_YIELD', 'PRODUCTION_USAGE', 'POS_SALE', 'WASTE')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'voiceCart',
        constraint: 'voiceCart_personId_key',
        columns: ['personId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'voiceCheckout',
        constraint: 'voiceCheckout_cartId_key',
        columns: ['cartId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'voiceCheckout',
        constraint: 'voiceCheckout_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'voiceContext',
        constraint: 'voiceContext_personId_key',
        columns: ['personId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'hQAuditEvent',
        index: 'hQAuditEvent_actorPersonId_idx_8eb33fdc',
        columns: ['actorPersonId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'measurementEvent',
        index: 'measurementEvent_eventType_idx_e4cf7742',
        columns: ['eventType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'measurementEvent',
        index: 'measurementEvent_occurredAt_idx_c6b89167',
        columns: ['occurredAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'measurementEvent',
        index: 'measurementEvent_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'measurementEvent',
        index: 'measurementEvent_personId_idx_e5e06b80',
        columns: ['personId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'measurementEvent',
        index: 'measurementEvent_vertical_idx_d5731260',
        columns: ['vertical'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menuItem',
        index: 'menuItem_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menuItemModifierGroup',
        index: 'menuItemModifierGroup_menuItemId_idx_715cce4c',
        columns: ['menuItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'menuItemModifierGroup',
        index: 'menuItemModifierGroup_modifierGroupId_idx_4a0521d7',
        columns: ['modifierGroupId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'modifierOption',
        index: 'modifierOption_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'modifierOption',
        index: 'modifierOption_modifierGroupId_idx_4a0521d7',
        columns: ['modifierGroupId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderItemModifier',
        index: 'orderItemModifier_modifierOptionId_idx_d5644f4f',
        columns: ['modifierOptionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderItemModifier',
        index: 'orderItemModifier_orderItemId_idx_99e2d9f7',
        columns: ['orderItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantOrder',
        index: 'restaurantOrder_shiftId_idx_fee8a58d',
        columns: ['shiftId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantProductionRun',
        index: 'restaurantProductionRun_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantProductionRun',
        index: 'restaurantProductionRun_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantProductionRun',
        index: 'restaurantProductionRun_recipeId_idx_037d8d32',
        columns: ['recipeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantRecipe',
        index: 'restaurantRecipe_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantRecipeIngredient',
        index: 'restaurantRecipeIngredient_itemId_idx_41357140',
        columns: ['itemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantRecipeIngredient',
        index: 'restaurantRecipeIngredient_recipeId_idx_037d8d32',
        columns: ['recipeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantShift',
        index: 'restaurantShift_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurantShift',
        index: 'restaurantShift_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'voiceCartItem',
        index: 'voiceCartItem_cartId_idx_79939295',
        columns: ['cartId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'voiceCartItem',
        index: 'voiceCartItem_menuItemId_idx_715cce4c',
        columns: ['menuItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'voiceCartItem',
        index: 'voiceCartItem_retailProductId_idx_b6539ddc',
        columns: ['retailProductId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'hQAuditEvent',
        foreignKey: {
          name: 'hQAuditEvent_actorPersonId_fkey',
          columns: ['actorPersonId'],
          references: { schema: 'public', table: 'person', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'menuItem',
        foreignKey: {
          name: 'menuItem_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'restaurantInventoryItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'menuItemModifierGroup',
        foreignKey: {
          name: 'menuItemModifierGroup_menuItemId_fkey',
          columns: ['menuItemId'],
          references: { schema: 'public', table: 'menuItem', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'menuItemModifierGroup',
        foreignKey: {
          name: 'menuItemModifierGroup_modifierGroupId_fkey',
          columns: ['modifierGroupId'],
          references: { schema: 'public', table: 'modifierGroup', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'modifierOption',
        foreignKey: {
          name: 'modifierOption_modifierGroupId_fkey',
          columns: ['modifierGroupId'],
          references: { schema: 'public', table: 'modifierGroup', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'modifierOption',
        foreignKey: {
          name: 'modifierOption_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'restaurantInventoryItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orderItemModifier',
        foreignKey: {
          name: 'orderItemModifier_orderItemId_fkey',
          columns: ['orderItemId'],
          references: { schema: 'public', table: 'orderItem', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orderItemModifier',
        foreignKey: {
          name: 'orderItemModifier_modifierOptionId_fkey',
          columns: ['modifierOptionId'],
          references: { schema: 'public', table: 'modifierOption', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantProductionRun',
        foreignKey: {
          name: 'restaurantProductionRun_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantProductionRun',
        foreignKey: {
          name: 'restaurantProductionRun_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantProductionRun',
        foreignKey: {
          name: 'restaurantProductionRun_recipeId_fkey',
          columns: ['recipeId'],
          references: { schema: 'public', table: 'restaurantRecipe', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantRecipe',
        foreignKey: {
          name: 'restaurantRecipe_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantRecipe',
        foreignKey: {
          name: 'restaurantRecipe_menuItemId_fkey',
          columns: ['menuItemId'],
          references: { schema: 'public', table: 'menuItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantInventoryItem',
        foreignKey: {
          name: 'restaurantInventoryItem_recipeId_fkey',
          columns: ['recipeId'],
          references: { schema: 'public', table: 'restaurantRecipe', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantRecipeIngredient',
        foreignKey: {
          name: 'restaurantRecipeIngredient_recipeId_fkey',
          columns: ['recipeId'],
          references: { schema: 'public', table: 'restaurantRecipe', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantRecipeIngredient',
        foreignKey: {
          name: 'restaurantRecipeIngredient_itemId_fkey',
          columns: ['itemId'],
          references: { schema: 'public', table: 'restaurantInventoryItem', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantShift',
        foreignKey: {
          name: 'restaurantShift_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantShift',
        foreignKey: {
          name: 'restaurantShift_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'location', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurantOrder',
        foreignKey: {
          name: 'restaurantOrder_shiftId_fkey',
          columns: ['shiftId'],
          references: { schema: 'public', table: 'restaurantShift', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'voiceCart',
        foreignKey: {
          name: 'voiceCart_personId_fkey',
          columns: ['personId'],
          references: { schema: 'public', table: 'person', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'voiceCartItem',
        foreignKey: {
          name: 'voiceCartItem_cartId_fkey',
          columns: ['cartId'],
          references: { schema: 'public', table: 'voiceCart', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'voiceCartItem',
        foreignKey: {
          name: 'voiceCartItem_retailProductId_fkey',
          columns: ['retailProductId'],
          references: { schema: 'public', table: 'retailProduct', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'voiceCartItem',
        foreignKey: {
          name: 'voiceCartItem_menuItemId_fkey',
          columns: ['menuItemId'],
          references: { schema: 'public', table: 'menuItem', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'voiceCheckout',
        foreignKey: {
          name: 'voiceCheckout_cartId_fkey',
          columns: ['cartId'],
          references: { schema: 'public', table: 'voiceCart', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'voiceContext',
        foreignKey: {
          name: 'voiceContext_personId_fkey',
          columns: ['personId'],
          references: { schema: 'public', table: 'person', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
