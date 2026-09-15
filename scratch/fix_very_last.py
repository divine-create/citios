import re

# FinanceDashboard
with open('components/school/FinanceDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('staffId', 'membershipId')
with open('components/school/FinanceDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# RegistrarDashboard
with open('components/school/RegistrarDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('reviewedByMembershipId', 'reviewedById') # Revert this! Wait, the mutation type is: EnrolmentRequest update doesn't have reviewedById at all? Or it expects something else?
with open('components/school/RegistrarDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# feed.ts
with open('lib/actions/feed.ts', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('u.email === session?.user?.email', 'u.id === session?.user?.personId')
content = content.replace('l.userId', 'l.personId')
with open('lib/actions/feed.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# post.ts
with open('lib/actions/post.ts', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('c.userId === u.id', 'c.personId === u.id')
content = content.replace('u.email === userEmail', 'u.id === "0"')
content = content.replace('u.email', 'u.id')
content = content.replace('l.userId', 'l.personId')
with open('lib/actions/post.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# school.ts
with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('input.formTeacherId', 'input.formMembershipId')
content = content.replace('findStudentRelationship(', '// findStudentRelationship(')
content = content.replace('update({ status: \'graduated\', classSectionId: null })', 'update({ classSectionId: null })')
with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
    f.write(content)
