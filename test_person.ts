import { db } from './src/prisma/db';
async function run() {
  const personId = '8f9d3649-823e-4c5b-8ffd-ce6ff507f0cd'; // From the error log earlier
  const person = await db.orm.public.Person.where({ id: personId }).first();
  console.log('Person:', person ? person.id : 'not found');
  if (person) {
    console.log('homeCityId:', person.homeCityId);
    if (person.homeCityId) {
      const city = await db.orm.public.City.where({ id: person.homeCityId }).first();
      console.log('City:', city ? city.slug : 'not found');
    }
  }
}
run();
