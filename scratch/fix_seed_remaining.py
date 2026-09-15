import re

with open('scripts/seed.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix return type of findOrCreateStudentData helper
content = content.replace(
    'Promise<typeof import(\'../src/prisma/db.js\').db.orm.public.StudentData extends { where: (...a: any[]) => infer R } ? Awaited<ReturnType<Awaited<R>[\'first\']>> : any>',
    'Promise<any>'
)

# 2. Add '!' to student1, student2, student3 usages to suppress nullability TS warnings
content = content.replace('student1.', 'student1!.')
content = content.replace('student2.', 'student2!.')
content = content.replace('student3.', 'student3!.')
content = content.replace('student.', 'student!.')
content = content.replace('parentSeed.student.', 'parentSeed.student!.')

# 3. StaffData.create doesn't have jobTitle
content = content.replace("jobTitle: 'Senior Math Teacher',", "")

# 4. EnrolmentRequest fields
content = content.replace('studentId: student3!.id', 'studentDataId: student3!.id')
content = content.replace('requestedById: registrarUser.id', 'requestedByPersonId: registrarUser!.id')
content = content.replace('studentId: student3.id', 'studentDataId: student3.id') # just in case

# 5. SchoolEvent fields
content = content.replace('createdById: principalUser.id', 'createdByMembershipId: principalUser!.id')

# Note: principalUser is currently a Person, but createdByMembershipId needs a Membership!
# Let's fix principalUser to be a membership in the event creation block.
old_principal_event = "const principalUser = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: 'principal@cityconnect.local' }).all().first().then(async (id) => id ? db.orm.public.Person.where({ id: id.personId }).all().first() : null);\n  if (principalUser) {"
new_principal_event = """const principalUser = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: 'principal@cityconnect.local' }).all().first().then(async (id) => id ? db.orm.public.Person.where({ id: id.personId }).all().first() : null);
  const principalMembership = principalUser ? await findOrCreateMembership(principalUser.id, school.id) : null;
  if (principalUser && principalMembership) {"""
content = content.replace(old_principal_event, new_principal_event)
content = content.replace('createdByMembershipId: principalUser!.id', 'createdByMembershipId: principalMembership!.id')

# 6. RestaurantOrder residentId -> customerDataId (optional, we can just remove it or change to null)
# Since we don't have a CustomerData for admin in Restaurant, let's just delete the residentId line.
content = content.replace("residentId: adminUser.id,", "")

# 7. Ticket userId -> personId
content = content.replace("userId: adminUser.id,", "personId: adminUser.id,")

# 8. Booking userId -> personId (note: already caught by above since it's the same string, but let's be safe if it didn't match)
# Actually, the string "userId: adminUser.id," will replace both Ticket and Booking! 
# Let's double check if there are any other `userId: adminUser.id` instances.
# In seed.ts, there was GigWorkerProfile, but that was replaced. There was OrganizationMember, also replaced.

# 9. Comment userId -> personId
content = content.replace("userId: adminUser.id", "personId: adminUser.id")

# Write back
with open('scripts/seed.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
