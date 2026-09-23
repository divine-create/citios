import sys

with open('lib/actions/resident.ts', 'r', encoding='utf-8') as f:
    c = f.read()

good = ''''use server'
import { db } from '@/src/prisma/db'
import { getCurrentCity } from '@/lib/city'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';'''
c = c.replace(''''use server'
import { db } from '@/src/prisma/db'
import { getCurrentCity } from '@/lib/city' '''.strip(), good)

# Also fix the where({ relationshipId: { in: wardRelIds } }) using Prisma Next safe filter!
c = c.replace('const students = await db.orm.public.StudentData.where({ relationshipId: { in: wardRelIds } }).all();', '''const allStudents = await db.orm.public.StudentData.all();
    const students = allStudents.filter(s => wardRelIds.includes(s.relationshipId));''')

with open('lib/actions/resident.ts', 'w', encoding='utf-8') as f:
    f.write(c)
