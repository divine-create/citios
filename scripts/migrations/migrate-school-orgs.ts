import { db } from '../../src/prisma/db';

export async function migrateSchoolOrgs() {
  console.log('Starting SchoolOS Organization Migration...');

  await db.transaction(async (tx: any) => {
      const classes = await tx.sql`SELECT id, "organizationId" FROM "SchoolClass"`;
      for (const cls of classes) {
        await tx.sql`UPDATE "Gradebook" SET "organizationId" = ${cls.organizationId} WHERE "classId" = ${cls.id} AND "organizationId" IS NULL`;
      }

      const gradebooks = await tx.sql`SELECT id, "organizationId" FROM "Gradebook" WHERE "organizationId" IS NOT NULL`;
      for (const gb of gradebooks) {
        await tx.sql`UPDATE "Grade" SET "organizationId" = ${gb.organizationId} WHERE "gradebookId" = ${gb.id} AND "organizationId" IS NULL`;
      }

      const studentData = await tx.sql`
        SELECT s.id, r."organizationId" 
        FROM "StudentData" s
        JOIN "Relationship" r ON s."relationshipId" = r.id
      `;
      for (const s of studentData) {
        if (s.organizationId) {
          await tx.sql`UPDATE "Attendance" SET "organizationId" = ${s.organizationId} WHERE "studentDataId" = ${s.id} AND "organizationId" IS NULL`;
        }
      }
  });
  
  console.log('Migration complete.');
}
