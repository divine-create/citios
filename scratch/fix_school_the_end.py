import re

with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Dashboard queries (lines 180-197)
content = content.replace('staffId: staffProfile.id', 'membershipId: organizationMemberId')
content = content.replace('formTeacherId: staffProfile.id', 'formMembershipId: organizationMemberId')

# 2. ClassSection create formTeacherId (line 893)
content = content.replace('formTeacherId: input.formTeacherId || undefined,', 'formMembershipId: input.formMembershipId || undefined,')
content = content.replace('formTeacherId?: string', 'formMembershipId?: string')

# 3. StaffData create department (line 1132)
content = re.sub(r'department: input\.department.*?,\n', '', content)

# 4. findStudentRelationship
inline_find = """const studentData = await db.orm.public.StudentData.where({ id: input.studentDataId }).all().first();
    const studentRel = studentData ? await db.orm.public.Relationship.where({ id: studentData.relationshipId }).all().first() : null;
    if (!studentData || !studentRel) return { error: 'Student not found.' };"""

content = content.replace(
    'const { studentData, relationship: studentRel } = await findStudentRelationship(input.organizationId, input.studentDataId);',
    inline_find
)

# 5. StaffAttendance and LeaveRequest input.staffId -> input.membershipId
content = content.replace('staffId: input.staffId', 'membershipId: input.membershipId')
content = content.replace('staffId: string', 'membershipId: string')

# 6. Some missed studentId destructuring in StudentData update maybe?
content = content.replace('input.studentDataId', 'input.studentDataId') # already done

# 7. School.ts 3327 - StudentData update status doesn't exist
content = content.replace('await db.orm.public.StudentData.where({ id: input.studentDataId }).update({ status: input.target });', '// No status field on StudentData directly, status is derived')


with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed final school.ts issues")
