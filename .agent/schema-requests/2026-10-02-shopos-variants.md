# Request

## Agent
ShopOS

## Problem
Phase 3C requires products to represent variants and sale prices. Currently, `RetailProduct` does not have a `compareAtPrice` field for discounts, nor does it support variations (like size/color). Creating a separate `RetailProductVariant` model would require massive refactoring to `RetailLocationStock` and `RetailOrderItem`.

## Existing Models
`RetailProduct`

## Proposed Change
Add to `RetailProduct`:
- `compareAtPrice Float?`
- `parentId String?`
- `parent RetailProduct? @relation("ProductVariants", fields: [parentId], references: [id], onDelete: Cascade)`
- `variants RetailProduct[] @relation("ProductVariants")`
- `variantName String?` // e.g. "Size M, Color Red"

## Reason
This allows variants to be treated as first-class products, meaning `RetailLocationStock` and `RetailOrderItem` do not need any schema changes to support variants! The parent product just acts as a container.

## Dependencies
None outside of ShopOS.

## Migration Risk
Low. Adds nullable fields.

## Alternatives Considered
Creating a separate `RetailProductVariant` model. Rejected because it would require rewriting the entire inventory location tracking and order line item systems.

## Testing
We will test that variants can be created and that `compareAtPrice` is properly stored.
