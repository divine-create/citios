import os
f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    lines = file.readlines()

out = []
for line in lines:
    if "db.orm.public.Transaction.where({ organizationId }).all()" in line:
        out.append("    Promise.resolve([]),\n")
    else:
        out.append(line)

with open(f, 'w', encoding='utf-8') as file:
    file.writelines(out)
