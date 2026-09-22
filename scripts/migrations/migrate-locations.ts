import { db } from "../../src/prisma/db";

export async function migrateRestaurantLocations() {
  console.log("Starting RestaurantOS Location Migration...");

  await db.transaction(async (tx: any) => {
    const orgs = await tx.sql`
      SELECT DISTINCT "organizationId" FROM "RestaurantSettings"
      UNION
      SELECT DISTINCT "organizationId" FROM "MenuItem"
    `;

    console.log(`Found ${orgs.length} organizations with RestaurantOS data.`);

    for (const row of orgs) {
      const orgId = row.organizationId;
      
      const locations = await tx.sql`
        SELECT id FROM "Location" WHERE "organizationId" = ${orgId} ORDER BY "createdAt" ASC
      `;

      let targetLocationId: string | null = null;

      if (locations.length === 0) {
        const orgInfo = await tx.sql`SELECT name FROM "Organization" WHERE id = ${orgId}`;
        const orgName = orgInfo[0]?.name || "Unknown";
        
        console.log(`Org ${orgId} has no locations. Creating default main location.`);
        const newLoc = await tx.sql`
          INSERT INTO "Location" ("id", "organizationId", "name", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${orgId}, ${orgName + ' Main Location'}, NOW(), NOW())
          RETURNING id
        `;
        targetLocationId = newLoc[0].id;
      } else if (locations.length === 1) {
        targetLocationId = locations[0].id;
      } else {
        throw new Error(`MIGRATION BLOCKED: Org ${orgId} has ${locations.length} locations. Ambiguity detected for un-located records. Cannot deterministically migrate.`);
      }

      console.log(`Migrating data for org ${orgId} to location ${targetLocationId}`);

      const tables = ['MenuItem', 'RestaurantTable', 'RestaurantOrder', 'RestaurantReservation', 'RestaurantInventoryItem', 'RestaurantExpense'];
      
      for (const table of tables) {
        await tx.sql(`UPDATE "${table}" SET "locationId" = $1 WHERE "organizationId" = $2 AND "locationId" IS NULL`, [targetLocationId, orgId]);
      }
      
      try {
        await tx.sql`UPDATE "RestaurantStockMovement" SET "locationId" = ${targetLocationId} WHERE "organizationId" = ${orgId} AND "locationId" IS NULL`;
      } catch (e) {
      }
    }
  });

  console.log("Migration completed safely.");
}
