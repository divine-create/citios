import test from 'node:test';
import assert from 'node:assert/strict';
import { getCityAreas, getAreaBySlug, detectAreaFromAddress } from './city-areas';
import { getCityFood } from '@/app/actions/food';

test('City Areas Registry and Address Detection', async (t) => {
  await t.test('1. Resolves canonical areas for Calabar', () => {
    const areas = getCityAreas('calabar');
    assert.ok(areas.length >= 6, 'Should have at least 6 canonical areas for Calabar');
    
    const marian = areas.find((a) => a.id === 'marian-road');
    assert.ok(marian, 'Marian Road should exist');
    assert.equal(marian?.shortName, 'Marian Road');

    const stateHousing = areas.find((a) => a.id === 'state-housing');
    assert.ok(stateHousing, 'State Housing should exist');

    const calabarSouth = areas.find((a) => a.id === 'calabar-south');
    assert.ok(calabarSouth, 'Calabar South should exist');
  });

  await t.test('2. detectAreaFromAddress accurately detects areas from address strings', () => {
    const marian1 = detectAreaFromAddress('calabar', '14 Marian Road, Near Total Fuel Station, Calabar');
    assert.equal(marian1?.id, 'marian-road');

    const marian2 = detectAreaFromAddress('calabar', 'Plot 5 Ndidem Usang Iso Road, Calabar');
    assert.equal(marian2?.id, 'marian-road');

    const housing = detectAreaFromAddress('calabar', 'Road 3, State Housing Estate, Calabar');
    assert.equal(housing?.id, 'state-housing');

    const unical = detectAreaFromAddress('calabar', 'University of Calabar Malabor Hall');
    assert.equal(unical?.id, 'unical-campus');

    const south = detectAreaFromAddress('calabar', 'Watt Market Main Gate, Calabar South');
    assert.equal(south?.id, 'calabar-south');

    const federal = detectAreaFromAddress('calabar', '8 Miles Ikot Ansa Expressway');
    assert.equal(federal?.id, 'federal-housing');
  });

  await t.test('3. getAreaBySlug resolves area or returns null for all/invalid', () => {
    const match = getAreaBySlug('calabar', 'marian-road');
    assert.equal(match?.name, 'Marian Road & Environs');

    const all = getAreaBySlug('calabar', 'all');
    assert.equal(all, null);

    const unknown = getAreaBySlug('calabar', 'non-existent-area-xyz');
    assert.equal(unknown, null);
  });

  await t.test('4. getCityFood enriches restaurants with area and areaSlug and returns areas list', async () => {
    const data = await getCityFood('calabar');
    assert.ok(data, 'getCityFood should return data object');
    assert.ok(Array.isArray(data.areas), 'Should return areas array');
    assert.ok(data.areas.length > 0, 'Should have areas populated');
    
    // First area should be 'all'
    assert.equal(data.areas[0].id, 'all');

    // If restaurants exist in DB, verify they have area and areaSlug
    if (data.restaurants.length > 0) {
      for (const r of data.restaurants) {
        assert.ok(r.area !== undefined, 'Restaurant should have area defined');
        assert.ok((r as any).areaSlug !== undefined, 'Restaurant should have areaSlug defined');
      }
    }
  });
});
