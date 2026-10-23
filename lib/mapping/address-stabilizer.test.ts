import { test } from 'node:test';
import assert from 'node:assert';
import {
  normalizeCalabarLGA,
  searchLocalLandmarks,
  scoreAddressConfidence,
  stabilizeAddressInput,
  findNearestLandmark,
} from './address-stabilizer';

test('Address Stabilizer — Calabar & Calabar Municipality Unified Mapping', async (t) => {
  await t.test('1. Merges Calabar and Calabar Municipality into unified calabar-municipal LGA', () => {
    assert.strictEqual(normalizeCalabarLGA('Calabar'), 'calabar-municipal');
    assert.strictEqual(normalizeCalabarLGA('Calabar Municipality'), 'calabar-municipal');
    assert.strictEqual(normalizeCalabarLGA('Calabar Municipal'), 'calabar-municipal');
    assert.strictEqual(normalizeCalabarLGA('calabar-municipal'), 'calabar-municipal');
    assert.strictEqual(normalizeCalabarLGA('CR-MUN'), 'calabar-municipal');

    // Calabar South remains distinct
    assert.strictEqual(normalizeCalabarLGA('Calabar South'), 'calabar-south');
    assert.strictEqual(normalizeCalabarLGA('Anantigha'), 'calabar-south');
    assert.strictEqual(normalizeCalabarLGA('Watt Market'), 'calabar-south');
  });

  await t.test('2. Instant offline landmark search returns verified Calabar entrance pins', () => {
    const apexResults = searchLocalLandmarks('Apex');
    assert.ok(apexResults.length > 0);
    assert.strictEqual(apexResults[0].id, 'lion-bank-apex');
    assert.ok(apexResults[0].entrancePin != null);

    const rabanaResults = searchLocalLandmarks('Rabana');
    assert.ok(rabanaResults.length > 0);
    assert.strictEqual(rabanaResults[0].id, 'rabana-roundabout');

    const unicalResults = searchLocalLandmarks('Malabor');
    assert.ok(unicalResults.length > 0);
    assert.strictEqual(unicalResults[0].id, 'unical-main-gate');

    const crutechResults = searchLocalLandmarks('CRUTECH');
    assert.ok(crutechResults.length > 0);
    assert.strictEqual(crutechResults[0].id, 'crutech-main-gate');
  });

  await t.test('3. Stabilizes explicit GPS coordinates with reverse landmark snapping', () => {
    // Coordinate near Rabana Roundabout
    const stabilized = stabilizeAddressInput({
      addressText: '14 Asari Eso Lane',
      latitude: 4.9660,
      longitude: 8.3340,
      visualDescription: 'Yellow 2-storey building, black gate',
      driverNotes: 'Ring bell at pedestrian gate',
    });

    assert.strictEqual(stabilized.resolutionSource, 'EXPLICIT_GPS');
    assert.strictEqual(stabilized.latitude, 4.9660);
    assert.strictEqual(stabilized.longitude, 8.3340);
    assert.strictEqual(stabilized.landmarkId, 'rabana-roundabout');
    assert.strictEqual(stabilized.lgaId, 'calabar-municipal');
    assert.strictEqual(stabilized.isServiceable, true);
    assert.ok(stabilized.confidenceScore >= 80, `Expected confidence >= 80, got ${stabilized.confidenceScore}`);
  });

  await t.test('4. Stabilizes landmark-anchored address without raw GPS', () => {
    const stabilized = stabilizeAddressInput({
      addressText: 'Shop 4B, Marian Market Arcade',
      landmarkId: 'lion-bank-apex',
      visualDescription: 'Next to pharmaceutical dispensary',
    });

    assert.strictEqual(stabilized.resolutionSource, 'LANDMARK_PIN');
    assert.strictEqual(stabilized.latitude, 4.9718); // Entrance pin of Lion Bank / Apex
    assert.strictEqual(stabilized.longitude, 8.3372);
    assert.strictEqual(stabilized.zoneId, 'marian-road');
    assert.strictEqual(stabilized.lgaId, 'calabar-municipal');
    assert.strictEqual(stabilized.isServiceable, true);
    assert.ok(stabilized.confidenceScore >= 70);
  });

  await t.test('5. Heuristic text fallback snaps informal references (e.g. Watt Market / Goldie)', () => {
    const stabilized = stabilizeAddressInput({
      addressText: 'Near Watt Market, Goldie Street, Calabar',
    });

    assert.strictEqual(stabilized.resolutionSource, 'LANDMARK_PIN');
    assert.strictEqual(stabilized.lgaId, 'calabar-south');
    assert.strictEqual(stabilized.zoneId, 'calabar-south');
    assert.strictEqual(stabilized.isServiceable, true);
    assert.ok(stabilized.confidenceScore >= 50);
  });

  await t.test('6. Fail-closed serviceability: points outside Calabar fail coverage checks', () => {
    // Lagos coordinate
    const outOfBounds = stabilizeAddressInput({
      addressText: '10 Marina Street, Lagos Island',
      latitude: 6.4531,
      longitude: 3.3958,
    });

    assert.strictEqual(outOfBounds.isServiceable, false);
  });
});
