import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

code = code.replace(
  /const existingCount = await tx\.execute\(db\.raw\.sql`SELECT id FROM "restaurantShift" WHERE "organizationId" = \$\{input\.organizationId\} AND "locationId" = \$\{input\.locationId\} AND "status" = 'OPEN' FOR UPDATE`\.affectedCount\(\)\.build\(\)\);/,
  `let existingCount = 0;
        if (input.locationId) {
          existingCount = await tx.execute(db.raw.sql\`SELECT id FROM "restaurantShift" WHERE "organizationId" = \${input.organizationId} AND "locationId" = \${input.locationId} AND "status" = 'OPEN' FOR UPDATE\`.affectedCount().build());
        } else {
          existingCount = await tx.execute(db.raw.sql\`SELECT id FROM "restaurantShift" WHERE "organizationId" = \${input.organizationId} AND "locationId" IS NULL AND "status" = 'OPEN' FOR UPDATE\`.affectedCount().build());
        }`
);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
