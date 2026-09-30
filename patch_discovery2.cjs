const fs = require('fs');
let code = fs.readFileSync('lib/voice/tools/impl/discovery.ts', 'utf8');

const helper = `
// Helper to extract citySlug
async function getResidentCitySlug(session: any): Promise<string | undefined> {
  if (!session?.user?.personId) return undefined;
  const { db } = await import('@/src/prisma/db');
  const person = await db.orm.public.Person.where({ id: session.user.personId }).first();
  if (person?.homeCityId) {
    const city = await db.orm.public.City.where({ id: person.homeCityId }).first();
    if (city) return city.slug;
  }
  return undefined;
}
`;

if (!code.includes('getResidentCitySlug')) {
  code = code.replace(
    "export const searchCity",
    helper + "\nexport const searchCity"
  );
  
  // Patch searchCity
  code = code.replace(
    "const res = await searchCityExplore(undefined, args.query || '', 'All');",
    "const citySlug = await getResidentCitySlug(session);\n    const res = await searchCityExplore(citySlug, args.query || '', 'All');"
  );
  
  // Patch searchProducts
  code = code.replace(
    "    // Explicitly fetch the resident's home city since we are in a headless API context\n    const { db } = await import('@/src/prisma/db');\n    const person = await db.orm.public.Person.where({ id: session.user.personId }).first();\n    let citySlug: string | undefined = undefined;\n    if (person?.homeCityId) {\n      const city = await db.orm.public.City.where({ id: person.homeCityId }).first();\n      if (city) citySlug = city.slug;\n    }",
    "    const citySlug = await getResidentCitySlug(session);"
  );
  
  // Patch searchBusinesses
  code = code.replace(
    "const stores = await getCityMartStores();",
    "const citySlug = await getResidentCitySlug(session);\n    const stores = await getCityMartStores(citySlug);"
  );
  
  // Patch searchRestaurants
  code = code.replace(
    "const res = await getCityFood();",
    "const citySlug = await getResidentCitySlug(session);\n    const res = await getCityFood(citySlug);"
  );
  
  // Patch searchFoodItems
  code = code.replace(
    "const res = await getCityFood();",
    "const citySlug = await getResidentCitySlug(session);\n    const res = await getCityFood(citySlug);"
  );
  
  fs.writeFileSync('lib/voice/tools/impl/discovery.ts', code);
}
