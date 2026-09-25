with open("components/cityos/BusinessDashboard.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    "SCHOOL: { href: currentBusiness ? `/workspaces/schoolos/${currentBusiness.id}` : '/admin/school', label: 'Full EduOS' }",
    "SCHOOL: { href: currentBusiness ? `/school/admin?org=${currentBusiness.id}` : '/school/admin', label: 'Full EduOS' }"
)

with open("components/cityos/BusinessDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(c)
