import os

# Fix 1: RegisterForm.tsx
f1 = 'app/business/register/RegisterForm.tsx'
with open(f1, 'r', encoding='utf-8') as f:
    c1 = f.read()

c1 = c1.replace(
    "else if (formData.type === 'SCHOOL') destination = `/workspaces/schoolos/${orgId}`;",
    "else if (formData.type === 'SCHOOL') destination = `/school/admin?org=${orgId}`;"
)
with open(f1, 'w', encoding='utf-8') as f:
    f.write(c1)


# Fix 2: SchoolRegisterForm.tsx
f2 = 'app/business/schoolos/register/SchoolRegisterForm.tsx'
if os.path.exists(f2):
    with open(f2, 'r', encoding='utf-8') as f:
        c2 = f.read()
    
    c2 = c2.replace(
        "const destination = orgId ? `/workspaces/schoolos/${orgId}` : '/school/admin';",
        "const destination = orgId ? `/school/admin?org=${orgId}` : '/school/admin';"
    )
    with open(f2, 'w', encoding='utf-8') as f:
        f.write(c2)

print("Fixed redirects.")
