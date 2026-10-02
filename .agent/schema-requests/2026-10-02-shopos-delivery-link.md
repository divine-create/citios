# Request

## Agent
ShopOS Engineering Lead

## Problem
ShopOS Phase 2 requires integrating retail orders with LogisticsOS for fulfillment. Currently, the `DeliveryJob` model in LogisticsOS strictly binds only to `RestaurantOS` via `restaurantOrderId`. There is no canonical way to link a `RetailOrder` to a `DeliveryJob`.

## Existing Models
- `RetailOrder`: Owns the retail intent, currently lacks any logistics linkage.
- `DeliveryJob`: Owns the delivery execution in LogisticsOS, currently hardcoded with `restaurantOrderId String? @unique`.

## Proposed Change
Modify `DeliveryJob` in `src/prisma/contract.prisma`:
```prisma
model DeliveryJob {
  // ... existing fields
  restaurantOrderId String?      @unique
  restaurantOrder   RestaurantOrder? @relation(fields: [restaurantOrderId], references: [id])

  retailOrderId     String?      @unique
  retailOrder       RetailOrder? @relation(fields: [retailOrderId], references: [id])
}
```

## Reason
This precisely follows the established architectural pattern created by RestaurantOS for linking domain-specific orders to the shared LogisticsOS `DeliveryJob`. It avoids creating duplicate logistics infrastructure inside ShopOS.

## Dependencies
- LogisticsOS (owns `DeliveryJob`).

## Migration Risk
Low. Adding an optional foreign key is a non-breaking schema evolution.

## Alternatives Considered
- Creating `RetailDeliveryJob`: Rejected, violates the core principle of reusing shared logistics infrastructure.
- Modifying `DeliveryJob` to use generic `orderId` and `orderType`: Rejected, this would require refactoring the existing RestaurantOS integration, violating the rule to not silently break/modify other OS architectures.

## Testing
Unit and integration tests for ShopOS fulfillment will assert against this relation once the schema is emitted.
