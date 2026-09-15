import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. getDailyAttendance
    get_daily = """export async function getDailyAttendance(organizationId: string, dateStr?: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);

    const day = startOfDay(dateStr ? new Date(dateStr) : new Date());
    const dayMs = day.getTime();

    const sections = await db.orm.public.ClassSection.where({ organizationId }).all();
    const relationships = await db.orm.public.Relationship.where({ organizationId, type: 'STUDENT' }).all();

    const records: any[] = [];
    for (const rel of relationships) {
      const studentData = await db.orm.public.StudentData.where({ relationshipId: rel.id }).all().first();
      const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
      if (!studentData || !person) continue;

      const rows = await db.orm.public.Attendance.where({ studentDataId: studentData.id }).all();
      const todayRecord = rows.find((r) => epochMs(r.date) === dayMs);
      
      records.push({
        studentId: studentData.id,
        studentName: `${person.firstName} ${person.lastName}`,
        classSectionName: sections.find((s) => s.id === studentData.classSectionId)?.name ?? null,
        yearLevel: studentData.yearLevel,
        status: todayRecord?.status ?? null,
      });
    }
    
    records.sort((a, b) => a.studentName.localeCompare(b.studentName));

    return JSON.parse(JSON.stringify({ date: day.toISOString(), records }));
  } catch (error) {
    console.error('Error fetching daily attendance:', error);
    return { date: new Date().toISOString(), records: [] };
  }
}"""
    content = re.sub(r'export async function getDailyAttendance\(organizationId: string, dateStr\?: string\) \{.*?return \{ date: new Date\(\)\.toISOString\(\), records: \[\] \};\n  \}\n\}', lambda m: get_daily, content, flags=re.DOTALL)


    # 2. markAttendance
    mark_att = """export async function markAttendance(
  studentId: string, // maps to StudentData.id
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
  date?: string,
  markedById?: string // maps to Membership.id
) {
  try {
    const sd = await db.orm.public.StudentData.where({ id: studentId }).all().first();
    if (!sd) return { error: 'Student not found.' };

    const rel = await db.orm.public.Relationship.where({ id: sd.relationshipId }).all().first();
    if (!rel) return { error: 'Student relation not found.' };

    const { membership } = await requireMembership(rel.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);

    const term = await getCurrentTerm(rel.organizationId);
    if (!term) return { error: 'No term is set up for this school year yet.' };

    const day = startOfDay(date ? new Date(date) : new Date());
    const dayInstant = toInstant(day);

    const existing = await db.orm.public.Attendance.where({ studentDataId: studentId, date: dayInstant }).all().first();
    if (existing) {
      await db.orm.public.Attendance.where({ id: existing.id }).update({
        status,
        markedById: markedById ?? membership.id,
      });
    } else {
      await db.orm.public.Attendance.create({
        studentDataId: studentId,
        termId: term.id,
        date: dayInstant,
        status,
        markedById: markedById ?? membership.id,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { error: 'Failed to mark attendance.' };
  }
}"""
    content = re.sub(r'export async function markAttendance\(\n  studentId: string,\n  status: \'PRESENT\' \| \'ABSENT\' \| \'LATE\' \| \'EXCUSED\',\n  date\?: string,\n  markedById\?: string\n\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error marking attendance:\', error\);\n    return \{ error: \'Failed to mark attendance\.\' \};\n  \}\n\}', lambda m: mark_att, content, flags=re.DOTALL)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced attendance functions")

if __name__ == "__main__":
    main()
