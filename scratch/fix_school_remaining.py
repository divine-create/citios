import re

with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Missing imports
if 'import { requireMembership' not in content:
    content = 'import { requireMembership, requireAuthenticatedAccount } from "@/lib/actions/tenant";\n' + content
elif 'requireAuthenticatedAccount' not in content:
    content = content.replace('import { requireMembership', 'import { requireMembership, requireAuthenticatedAccount')

# 1. StaffAttendance and LeaveRequest staffId -> membershipId
# Check lines 1710 and 1907
content = re.sub(r'(model: "StaffAttendance",[^}]*)staffId( *:)', r'\1membershipId\2', content)
content = re.sub(r'(model: "LeaveRequest",[^}]*)staffId( *:)', r'\1membershipId\2', content)

# Also any generic staffId in create/update payloads
content = content.replace('staffId: data.staffId', 'membershipId: data.staffId')
content = content.replace('staffId: staffId', 'membershipId: staffId')
content = content.replace('staffId: staff.id', 'membershipId: staff.id')

# 2. WithdrawalRequest, Suspension, BehaviourIncident, ClassEnrolment, Grade, Attendance, ReportCard
# Let's just blindly replace `studentId:` with `studentDataId:` everywhere.
content = content.replace('studentId:', 'studentDataId:')

# 3. enrollmentStatus -> status
content = content.replace('enrollmentStatus:', 'status:')
content = content.replace('data.enrollmentStatus', 'data.status')

with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed school.ts")
