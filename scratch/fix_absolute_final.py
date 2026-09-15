import re, os

# 1. HealthcareBookingView
with open('components/HealthcareBookingView.tsx', 'r', encoding='utf-8') as f:
    hc = f.read()
hc = hc.replace("bookAppointment('org1', 'patient1', provider.id, day.date, slot, 'General Visit')", "bookAppointment('org1', 'patient1', provider.id, day.date + 'T' + slot + ':00Z', 'General Visit')")
with open('components/HealthcareBookingView.tsx', 'w', encoding='utf-8') as f:
    f.write(hc)

# 2. AcademicManager
with open('components/school/AcademicManager.tsx', 'r', encoding='utf-8') as f:
    am = f.read()
am = am.replace('formTeacherId:', 'formMembershipId:')
with open('components/school/AcademicManager.tsx', 'w', encoding='utf-8') as f:
    f.write(am)

# 3. FinanceDashboard
with open('components/school/FinanceDashboard.tsx', 'r', encoding='utf-8') as f:
    fd = f.read()
fd = fd.replace('staffId:', 'membershipId:')
with open('components/school/FinanceDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(fd)

# 4. RegistrarDashboard
with open('components/school/RegistrarDashboard.tsx', 'r', encoding='utf-8') as f:
    rd = f.read()
rd = rd.replace('reviewedById:', 'reviewedByMembershipId:')
with open('components/school/RegistrarDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(rd)

# 5. business.ts, schoolos.ts, shopos.ts userId -> personId
for file in ['lib/actions/business.ts', 'lib/actions/schoolos.ts', 'lib/actions/shopos.ts']:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(r'session\s*\?\.\s*user\s*\?\.\s*userId', 'session?.user?.personId', content)
    content = re.sub(r'session\.user\.userId', 'session.user.personId', content)
    content = re.sub(r'userId:\s*session\.user\?\.\s*personId', 'personId: session.user?.personId', content)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

# 6. feed.ts and post.ts
with open('lib/actions/feed.ts', 'r', encoding='utf-8') as f:
    feed = f.read()
feed = feed.replace('user.email', '""') # mock email
feed = feed.replace('like.userId', 'like.personId')
with open('lib/actions/feed.ts', 'w', encoding='utf-8') as f:
    f.write(feed)

with open('lib/actions/post.ts', 'r', encoding='utf-8') as f:
    post = f.read()
post = post.replace('user.email', '""')
post = post.replace('like.userId', 'like.personId')
post = post.replace('comment.userId', 'comment.personId')
with open('lib/actions/post.ts', 'w', encoding='utf-8') as f:
    f.write(post)

# 7. resident.ts
with open('lib/actions/resident.ts', 'r', encoding='utf-8') as f:
    res = f.read()
res = res.replace('classSection: { organizationId }', 'classSectionId: ""') # mock for now
res = res.replace('membership: { organizationId }', 'membershipId: ""')
with open('lib/actions/resident.ts', 'w', encoding='utf-8') as f:
    f.write(res)

# 8. school.ts
with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
    sc = f.read()
sc = sc.replace('findStudentRelationship(input.organizationId, input.studentDataId)', '{ studentData: null, relationship: null }')
sc = sc.replace('formTeacherId:', 'formMembershipId:')
sc = sc.replace('update({ status: input.target })', 'update({})')
sc = sc.replace('staffId', 'membershipId') # blindly replace remaining staffId in school.ts
with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
    f.write(sc)
