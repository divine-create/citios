import { searchRestaurants, searchBusinesses, searchCity } from './lib/voice/tools/impl/discovery';

async function run() {
  const session = { user: { personId: '8f9d3649-823e-4c5b-8ffd-ce6ff507f0cd' } };
  
  try {
    const resRest = await searchRestaurants.execute({ query: 'restaurant' }, session);
    console.log('searchRestaurants (query: restaurant):', resRest.data.length);
  } catch (e: any) {
    console.error('searchRestaurants failed:', e.message);
  }
}
run();
