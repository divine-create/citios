import os

f_path = 'app/(resident)/workspaces/[os]/[slug]/page.tsx'
with open(f_path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("import SchoolOSWorkspace from '@/components/cityos/workspaces/SchoolOSWorkspace';", "")

with open(f_path, 'w', encoding='utf-8') as f:
    f.write(c)

os.remove('components/cityos/workspaces/SchoolOSWorkspace.tsx')

print("Cleaned up SchoolOSWorkspace.")
