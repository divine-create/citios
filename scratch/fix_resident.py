import re

with open('lib/actions/resident.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix getSchoolProfile
content = content.replace(
    'const students = await db.orm.public.Student.where({ organizationId }).all();',
    'const students = await db.orm.public.StudentData.where({ classSection: { organizationId } }).all(); // approximate for old mock data'
)

# Fix teacherCount using MembershipRole
content = content.replace(
    "const teacherCount = (await db.orm.public.OrganizationMember.where({ organizationId, role: 'TEACHER' }).all()).length;",
    "const teacherCount = (await db.orm.public.MembershipRole.where({ role: 'TEACHER', membership: { organizationId } }).all()).length;"
)

# Fix getParentDashboard
content = content.replace(
    'const students = await db.orm.public.Student.all();',
    'const students = await db.orm.public.StudentData.all();'
)

with open('lib/actions/resident.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed resident.ts")
