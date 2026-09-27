import os

f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace("import { requireSystemAdmin, getSessionPersonId } from '@/lib/rbac';", "import { requireSystemAdmin } from '@/lib/rbac';\nimport { getServerSession } from 'next-auth';\nimport { authOptions } from '@/lib/auth';")

c = c.replace("const actorPersonId = await getSessionPersonId();", "const session = await getServerSession(authOptions);\n  const actorPersonId = session?.user?.personId || 'system';")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

f_test = 'lib/actions/hq.test.ts'
with open(f_test, 'r', encoding='utf-8') as file:
    c2 = file.read()

c2 = c2.replace("t.mock.method(rbac, 'getSessionPersonId', async () => 'test-admin-id');", "")

with open(f_test, 'w', encoding='utf-8') as file:
    file.write(c2)
