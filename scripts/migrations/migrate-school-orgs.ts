import { db } from '../../src/prisma/db';

export async function migrateSchoolOrgs() {
  console.log('Starting SchoolOS Organization Migration...');

  const classes = await db.orm.public.SchoolClass.all();
  let gradebooksUpdated = 0;
  for (const cls of classes) {
    gradebooksUpdated += (await db.orm.public.Gradebook.where({ classId: cls.id, organizationId: null }).update({ organizationId: cls.organizationId })).count;
  }
  console.log(Updated  Gradebook records.);

  const gradebooks = await db.orm.public.Gradebook.all();
  let gradesUpdated = 0;
  for (const gb of gradebooks) {
    if (gb.organizationId) {
      gradesUpdated += (await db.orm.public.Grade.where({ gradebookId: gb.id, organizationId: null }).update({ organizationId: gb.organizationId })).count;
    }
  }
  console.log(Updated  Grade records.);

  const studentData = await db.orm.public.StudentData.all();
  let attendancesUpdated = 0;
  for (const s of studentData) {
    const rel = await db.orm.public.Relationship.where({ id: s.relationshipId }).all().first();
    if (rel) {
      attendancesUpdated += (await db.orm.public.Attendance.where({ studentDataId: s.id, organizationId: null }).update({ organizationId: rel.organizationId })).count;
    }
  }
  console.log(Updated  Attendance records.);
  
  console.log('Migration complete.');
}
