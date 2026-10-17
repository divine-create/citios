import 'dotenv/config';
import { db } from '../src/prisma/db';
import { isTestOrDemoOrganization } from '../lib/storefront-filter';

async function main() {
  const allOrgs = await db.orm.public.Organization.all();
  const keptOrgs = allOrgs.filter((o: any) => !isTestOrDemoOrganization(o));
  const testOrgs = allOrgs.filter((o: any) => isTestOrDemoOrganization(o));

  console.log(`Found ${testOrgs.length} test/demo organizations to remove (keeping ${keptOrgs.length} authentic organizations).`);
  if (testOrgs.length === 0) {
    console.log('Nothing to clean.');
    return;
  }

  const keptIdsCsv = keptOrgs.map((o: any) => o.id).join(',');

  const plans = [
    db.raw.sql`DELETE FROM "discoveryListing" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "postLike" WHERE "postId" IN (SELECT "id" FROM "post" WHERE "organizationId" IS NOT NULL AND NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "comment" WHERE "postId" IN (SELECT "id" FROM "post" WHERE "organizationId" IS NOT NULL AND NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "post" WHERE "organizationId" IS NOT NULL AND NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "retailLocationStock" WHERE "productId" IN (SELECT "id" FROM "retailProduct" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "retailStockMovement" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "retailOrderItem" WHERE "orderId" IN (SELECT "id" FROM "retailOrder" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "retailOrderItem" WHERE "productId" IN (SELECT "id" FROM "retailProduct" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "payment" WHERE "retailOrderId" IN (SELECT "id" FROM "retailOrder" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "retailOrder" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "retailProduct" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "retailCategory" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "retailNotification" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "orderItem" WHERE "orderId" IN (SELECT "id" FROM "restaurantOrder" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "payment" WHERE "restaurantOrderId" IN (SELECT "id" FROM "restaurantOrder" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "restaurantOrder" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "restaurantShift" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "menuItemModifierGroup" WHERE "menuItemId" IN (SELECT "id" FROM "menuItem" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "menuItemAddon" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "menuItemVariant" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "menuItem" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "restaurantTable" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "serviceAppointment" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "serviceJob" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "serviceCatalogItem" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "reservation" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "roomBlock" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "rateRule" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "hotelRoom" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "logisticsSettlement" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "deliveryDispatch" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "deliveryAssignment" WHERE "deliveryJobId" IN (SELECT "id" FROM "deliveryJob" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "deliveryQuote" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "deliveryPricingRule" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "deliveryTrackingEvent" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "deliveryJob" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "logisticsDriverProfile" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "logisticsVehicle" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "logisticsFleet" WHERE NOT ("providerId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "ledgerEntry" WHERE "walletId" IN (SELECT "id" FROM "wallet" WHERE "organizationId" IS NOT NULL AND NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "wallet" WHERE "organizationId" IS NOT NULL AND NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "payout" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "customerData" WHERE "relationshipId" IN (SELECT "id" FROM "relationship" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ','))))`,
    db.raw.sql`DELETE FROM "relationship" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "location" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "membership" WHERE NOT ("organizationId" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
    db.raw.sql`DELETE FROM "organization" WHERE NOT ("id" = ANY(string_to_array(${keptIdsCsv}, ',')))`,
  ];

  for (let i = 0; i < plans.length; i++) {
    try {
      await db.transaction((tx: any) => tx.execute(plans[i].affectedCount().build()));
    } catch (err: any) {
      console.warn(`Statement #${i + 1} warning: ${err.message}`);
    }
  }

  const remainingOrgs = await db.orm.public.Organization.all();
  const remainingProducts = await db.orm.public.RetailProduct.all();
  const remainingMenus = await db.orm.public.MenuItem.all();
  const remainingServices = await db.orm.public.ServiceCatalogItem.all();
  const remainingListings = await db.orm.public.DiscoveryListing.all();

  console.log('AFTER CLEANUP TOTALS:', {
    orgs: remainingOrgs.length,
    products: remainingProducts.length,
    menus: remainingMenus.length,
    services: remainingServices.length,
    listings: remainingListings.length,
  });
}

main().then(() => process.exit(0));
