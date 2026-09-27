import os

f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    lines = file.readlines()

out = []
seen_import = False
for line in lines:
    if "import { requireSystemAdmin } from '@/lib/rbac';" in line:
        if seen_import:
            continue
        else:
            seen_import = True
    out.append(line)

with open(f, 'w', encoding='utf-8') as file:
    file.writelines(out)
