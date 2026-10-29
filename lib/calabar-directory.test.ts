import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDirectoryListings } from '../app/actions/directory';
import { DIRECTORY_CATEGORIES } from './directory-constants';

describe('Calabar City Business Directory', () => {
  it('1. Retrieves Calabar business listings across diverse non-food categories', async () => {
    const data = await getDirectoryListings({ citySlug: 'calabar' });

    assert.ok(data.listings.length > 0, 'Directory should return active listings in Calabar');
    assert.equal(data.cityName, 'Calabar');
    assert.ok(data.zones.length > 0, 'Directory should have operational zones');

    // Confirm presence of key categories
    const categories = new Set(data.listings.map((item) => item.category));
    assert.ok(categories.has('health') || categories.has('auto') || categories.has('artisans'),
      'Directory must contain essential service categories');
  });

  it('2. Filters accurately by category (Health & Pharmacy)', async () => {
    const healthData = await getDirectoryListings({
      citySlug: 'calabar',
      category: 'health',
    });

    assert.ok(healthData.listings.length > 0, 'Should find health & pharmacy businesses');
    healthData.listings.forEach((item) => {
      assert.equal(item.category, 'health');
    });

    const hasMedplusOrAlpha = healthData.listings.some(
      (item) => item.name.includes('Medplus') || item.name.includes('Alpha') || item.name.includes('Apex')
    );
    assert.ok(hasMedplusOrAlpha, 'Should include authentic Calabar pharmacies/clinics');
  });

  it('3. Filters accurately by category (Auto & Mechanics)', async () => {
    const autoData = await getDirectoryListings({
      citySlug: 'calabar',
      category: 'auto',
    });

    assert.ok(autoData.listings.length > 0, 'Should find auto & mechanic workshops');
    autoData.listings.forEach((item) => {
      assert.equal(item.category, 'auto');
    });
  });

  it('4. Filters accurately by zone (Marian Road)', async () => {
    const marianData = await getDirectoryListings({
      citySlug: 'calabar',
      zone: 'Marian Road',
    });

    assert.ok(marianData.listings.length > 0, 'Should find businesses in Marian Road zone');
    marianData.listings.forEach((item) => {
      assert.ok(
        (item.zone && item.zone.toLowerCase().includes('marian')) ||
        (item.address && item.address.toLowerCase().includes('marian')),
        `Item ${item.name} should belong to Marian Road zone`
      );
    });
  });

  it('5. Performs instant keyword search matching names, services, and landmarks', async () => {
    // Search by service keyword
    const serviceSearch = await getDirectoryListings({
      citySlug: 'calabar',
      query: 'Brake',
    });
    assert.ok(serviceSearch.listings.length > 0, 'Should match service keywords like Brake');

    // Search by tech keyword
    const techSearch = await getDirectoryListings({
      citySlug: 'calabar',
      query: 'Software',
    });
    assert.ok(techSearch.listings.length > 0, 'Should match business name Software');
  });

  it('6. Enforces architectural rules: verified contact actions, no fake products', async () => {
    const data = await getDirectoryListings({ citySlug: 'calabar' });

    data.listings.forEach((item) => {
      assert.ok(item.id, 'Every directory item must have an organizationId for claim');
      assert.ok(item.address, 'Every directory item must have a physical address in Calabar');
      assert.ok(item.phone, 'Every directory item must have a phone contact');
      assert.ok(item.whatsapp, 'Every directory item must have a formatted WhatsApp number');
      assert.equal(typeof item.isClaimed, 'boolean');
      assert.equal(typeof item.isVerified, 'boolean');
    });
  });
});
