import { searchCity } from './lib/voice/tools/impl/discovery';

async function run() {
  const session = { user: { personId: '8f9d3649-823e-4c5b-8ffd-ce6ff507f0cd' } };
  
  try {
    const res = await searchCity.execute({ query: '', category: 'HOTEL' }, session);
    console.log('searchCity (HOTEL):', res.data.length);
  } catch (e: any) {
    console.error('searchCity failed:', e.message);
  }
}
run();
