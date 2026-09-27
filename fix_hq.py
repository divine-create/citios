import os

f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    lines = file.readlines()

out = []
for line in lines:
    if "import { db } from '@/src/prisma/db';" in line and out.count("import { db } from '@/src/prisma/db';\n") >= 1:
        continue
    if "import { requireSystemAdmin" in line and out.count("import { requireSystemAdmin } from '@/lib/rbac';\n") >= 1:
        continue
    out.append(line)

with open(f, 'w', encoding='utf-8') as file:
    file.writelines(out)
