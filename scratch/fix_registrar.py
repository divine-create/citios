import re

with open('components/school/RegistrarDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(', reviewedById: reviewerUserId', '')
with open('components/school/RegistrarDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('components/school/FinanceDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
# Wait, FinanceDashboard had `error TS18004: No value exists in scope for the shorthand property 'staffId'`
# And my script replaced `staffId` with `membershipId`. 
# So now it's `{ membershipId }` which DOES exist in scope? Let's check FinanceDashboard
