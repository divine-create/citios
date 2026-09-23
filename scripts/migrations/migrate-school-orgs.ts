import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Migrating Attendance...');
  const attendances = await prisma.attendance.findMany({ where: { organizationId: null } });
  for (const att of attendances) {
    const sd = await prisma.studentData.findUnique({ where: { id: att.studentDataId } });
    if (sd) {
      const rel = await prisma.relationship.findUnique({ where: { id: sd.relationshipId } });
      if (rel) {
        await prisma.attendance.update({
          where: { id: att.id },
          data: { organizationId: rel.organizationId }
        });
      }
    }
  }

  console.log('Migrating Gradebook...');
  const gradebooks = await prisma.gradebook.findMany({ where: { organizationId: null } });
  for (const gb of gradebooks) {
    const cls = await prisma.schoolClass.findUnique({ where: { id: gb.classId } });
    if (cls) {
      await prisma.gradebook.update({
        where: { id: gb.id },
        data: { organizationId: cls.organizationId }
      });
    }
  }

  console.log('Migrating Grade...');
  const grades = await prisma.grade.findMany({ where: { organizationId: null } });
  for (const grade of grades) {
    const gb = await prisma.gradebook.findUnique({ where: { id: grade.gradebookId } });
    if (gb && gb.organizationId) {
      await prisma.grade.update({
        where: { id: grade.id },
        data: { organizationId: gb.organizationId }
      });
    } else if (gb) {
        const cls = await prisma.schoolClass.findUnique({ where: { id: gb.classId } });
        if (cls) {
            await prisma.grade.update({
                where: { id: grade.id },
                data: { organizationId: cls.organizationId }
            });
        }
    }
  }

  console.log('Migration complete.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
