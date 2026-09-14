import 'dotenv/config';
import { db } from './src/prisma/db';
import { createMicrosite } from './lib/actions/microsite';

async function test() {
  const org = await db.orm.public.Organization.where({ type: 'SCHOOL' }).all().first();
  if (!org) {
    console.log('No school found');
    return;
  }
  
  await db.orm.public.Microsite.where({ organizationId: org.id }).delete();
  
  console.log('Creating microsite for:', org.id);
  const res = await createMicrosite(org.id, {
    title: 'Test School',
    templateId: 'innovator',
    features: ['curriculum', 'contact', 'admissions', 'events'],
    customContent: {}
  });
  console.log(res);
}

test();
