import os

f_path = 'app/(resident)/workspaces/[os]/[slug]/page.tsx'
with open(f_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Add redirect for schoolos
new_redirect = """
  if (os === 'schoolos') {
    const { redirect } = await import('next/navigation');
    redirect(`/school/admin?org=${slug}`);
  }
"""

if "if (os === 'restaurantos')" in c:
    c = c.replace("if (os === 'restaurantos') {", new_redirect.strip() + "\n\n  if (os === 'restaurantos') {")

# Remove SchoolOSWorkspace render
c = c.replace("{os === 'schoolos' && <SchoolOSWorkspace slug={slug} />}", "")

with open(f_path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Updated Workspace page.")
