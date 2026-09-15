import re

with open('scripts/seed.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. StudentNote
content = content.replace("studentId: student1!.id,", "studentDataId: student1!.id,")
content = content.replace("studentId: student2!.id,", "studentDataId: student2!.id,")

counselor_old = "const counselorUser = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: 'counselor@cityconnect.local' }).all().first().then(async (id) => id ? db.orm.public.Person.where({ id: id.personId }).all().first() : null);"
counselor_new = """const counselorUser = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: 'counselor@cityconnect.local' }).all().first().then(async (id) => id ? db.orm.public.Person.where({ id: id.personId }).all().first() : null);
  const counselorMembership = counselorUser ? await findOrCreateMembership(counselorUser.id, school.id) : null;"""
content = content.replace(counselor_old, counselor_new)

content = content.replace("authorId: counselorUser.id", "authorMembershipId: counselorMembership!.id")
content = content.replace("authorId: counselorUser!.id", "authorMembershipId: counselorMembership!.id") # just in case

# 2. TruancyAlert
# studentId: student2!.id is already covered by the replace above!

# 3. TimetableSlot
content = content.replace("staffId: staffProfile.id", "membershipId: teacherMember.id")

with open('scripts/seed.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
