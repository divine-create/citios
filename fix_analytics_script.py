import os
import re

f1 = 'lib/actions/analytics.ts'
with open(f1, 'r', encoding='utf-8') as file:
    c1 = file.read()

c1 = c1.replace("import { getAuthSession } from '@/lib/auth';", "import { getServerSession } from 'next-auth';\nimport { authOptions } from '@/lib/auth';")
c1 = c1.replace("const session = await getAuthSession();", "const session = await getServerSession(authOptions);")
c1 = c1.replace("finalPersonId = session?.user?.id || null;", "finalPersonId = session?.user?.personId || null;")

c1 = c1.replace(".where((e) => e.eventType.equals('SEARCH_PERFORMED').and(e.occurredAt.gt(since)))",
                ".where({ eventType: 'SEARCH_PERFORMED' })")
                
# Actually Prisma Next eq is `.eq()` or object where. Let's just use object syntax.
# But I still need the date filter! 
# Let's fix that block manually.
