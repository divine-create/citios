import { db } from './src/prisma/db';

async function makeAdmin() {
  const persons = await db.orm.public.Person.all();
  console.log(`Found ${persons.length} persons.`);
  for (const person of persons) {
    await db.orm.public.Person.where({ id: person.id }).update({ isSystemAdmin: true });
    console.log(`Granted System Admin to ${person.firstName} ${person.lastName} (${person.id})`);
  }
}

makeAdmin().catch(console.error);
