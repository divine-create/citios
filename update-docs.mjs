import fs from 'fs';

const md = fs.readFileSync('docs/verticals/citymart.md', 'utf8');

const updated = md.replace('## Completed Work', `## Phase 2A: True Multi-Location Operations
**Active Location Context**:
- CityMart introduces an explicit active location context. A user selects their operating location, and operations (shifts, orders, stock adjustments) are bound to it.
- **Null Fallback Removal**: \`locationId\` is no longer treated as \`null\` (organization-wide fallback) for physical operations (Orders, Shifts, Stock). These now explicitly require an active location if the organization has locations.
- **Server Validation**: The backend rigorously verifies that the selected \`locationId\` exists and belongs to the authenticated \`organizationId\`.

**Inventory Location Model**:
- *Reason for Schema Change*: Phase 1 stored \`stockQuantity\` directly on \`RetailProduct\`, meaning inventory was organization-wide. To support true multi-location retail without duplicating the global product catalog, a schema change was required.
- *Schema Addition*: \`RetailLocationStock\` bridges \`RetailProduct\` and \`Location\`, holding \`stockQuantity\` per location.
- *Backward Compatibility*: If a business has no locations, it relies on the global \`RetailProduct.stockQuantity\`. If it uses locations, stock mutations target \`RetailLocationStock\`.

**Known Phase 2A Limitations**:
- *RBAC Limitation*: Cashiers still hold organization-wide location access as \`MembershipLocation\` RBAC is not yet strictly enforced. An authorized user can freely switch their active location among the organization's branches.

## Completed Work`);

fs.writeFileSync('docs/verticals/citymart.md', updated);
console.log('Updated citymart.md');
