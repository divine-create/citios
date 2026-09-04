# Backend Implementation Guide: Grocery Management System (CityMall & POS)

This document outlines the database schema updates and server actions required to wire up the frontend Grocery Admin portals (Manager, Picker, Dispatch, POS) to the Prisma database, specifically supporting the omnichannel (CityMall + Physical Store) architecture.

## 1. Database Schema Updates (`contract.prisma`)

### Role Additions
Update the `OrgRole` enum to support retail staff:
```prisma
enum OrgRole {
  // Existing roles...
  GROCERY_MANAGER
  GROCERY_PICKER
  GROCERY_DISPATCHER
  GROCERY_CASHIER
}
```

### New Models Required
*   **`Product`**: Represents items in the store's inventory.
    *   Fields: `orgId`, `sku`, `barcode`, `name`, `category`, `price`, `stockLevel`, `lowStockThreshold`, `vendorName`.
*   **`CityMallListing`**: Represents the public visibility of a product on the central CityMall marketplace.
    *   Fields: `productId` (Unique relation), `isActive`, `promotionalDiscount`, `searchTags`.
*   **`Order`**: Represents a customer purchase (either digital CityMall or in-store POS).
    *   Fields: `orgId`, `guestId` (User, nullable for anonymous walk-ins), `orderType` (CITYMALL_DELIVERY, CITYMALL_PICKUP, IN_STORE_POS), `status` (PENDING, PICKING, READY_FOR_DISPATCH, DELIVERED, COMPLETED), `totalPrice`.
*   **`OrderItem`**: Line items within an order.
    *   Fields: `orderId`, `productId`, `quantity`, `unitPrice`.
*   **`FulfillmentTask`**: Tracks the picking/dispatch process.
    *   Fields: `orderId`, `pickerId` (User), `dispatcherId` (User), `driverId` (User - CityRide), `pickedAt`, `dispatchedAt`.

## 2. Server Actions to Implement (`lib/actions/grocery.ts`)

### Manager Portal (`/grocery/manager`)
*   `getInventory(orgId)`: Fetches `Product` records, including a joined query on `CityMallListing` to show marketplace status.
*   `updateCityMallListing(productId, isActive, promo)`: Upserts the `CityMallListing` record.
*   `getOmnichannelRevenue(orgId)`: Aggregates `Order.totalPrice` grouped by `orderType` (CityMall vs In-Store).

### Point of Sale (`/grocery/pos`)
*   `searchProductsByBarcode(orgId, barcode)`: Fast lookup for cashier scanning.
*   `processPOSCheckout(orgId, items, paymentMethod)`: Creates an `Order` (status: COMPLETED, type: IN_STORE_POS), creates `OrderItem`s, decrements `Product.stockLevel`, and deducts funds via CityWallet if applicable.

### Order Picker App (`/grocery/picker`)
*   `getActiveBatch(orgId, pickerId)`: Fetches an `Order` in `PICKING` status assigned to the user, including all `OrderItem`s and their related `Product.category` (sorted for aisle walking).
*   `markItemPicked(orderItemId)`: Updates the fulfillment progress.
*   `handleOutofStockReplacement(orderItemId, newProductId)`: Swaps the `OrderItem` product reference and adjusts pricing.

### Dispatch Hub (`/grocery/dispatch`)
*   `getReadyOrders(orgId)`: Fetches `Order` records in `READY_FOR_DISPATCH` status.
*   `assignCityRideDriver(orderId, driverId)`: Updates `FulfillmentTask` and moves `Order.status` to `DELIVERED` when handed off.

## 3. Frontend Wiring Instructions
Once the server actions are created:
1.  Convert the static page routes into asynchronous Server Components.
2.  Await the relevant server actions (e.g., `const inventory = await getInventory(user.orgId)`).
3.  Pass the resulting data down as props to the Client Components (e.g., `<ManagerDashboard initialInventory={inventory} />`), replacing the hardcoded mock data.
