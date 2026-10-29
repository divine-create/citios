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
      if (item.phone) {
        assert.ok(typeof item.phone === 'string' && item.phone.length > 0);
      }
      if (item.whatsapp) {
        assert.ok(typeof item.whatsapp === 'string' && item.whatsapp.length > 0);
      }
      assert.equal(typeof item.isClaimed, 'boolean');
      assert.equal(typeof item.isVerified, 'boolean');
    });

    // Verify businesses with verified phones (e.g. Axari, Channel View, Medplus) have proper contact channels
    const verifiedSpot = data.listings.find(
      (i) => i.name.includes('Axari') || i.name.includes('Medplus') || i.name.includes('Apex') || i.name.includes('Channel View')
    );
    assert.ok(verifiedSpot, 'Should have verified directory businesses');
    assert.ok(verifiedSpot.phone, 'Verified business must have phone number');
  });

  it('7. Resolves listing detail pages cleanly and validates full JSON serializability', async () => {
    const { getResidentOrganization, getCanonicalOrganization } = await import('../app/actions/org');
    const { checkIsOpenNow, formatDisplayPhone } = await import('./directory-constants');

    // Test resilient helpers with diverse input types
    assert.doesNotThrow(() => checkIsOpenNow(null));
    assert.doesNotThrow(() => checkIsOpenNow('Mon - Fri: 8am - 6pm'));
    assert.doesNotThrow(() => checkIsOpenNow({ open: '08:00', close: '18:00' } as any));
    assert.doesNotThrow(() => formatDisplayPhone(null));
    assert.doesNotThrow(() => formatDisplayPhone('08033014488'));
    assert.doesNotThrow(() => formatDisplayPhone(8033014488 as any));

    const data = await getDirectoryListings({ citySlug: 'calabar' });
    assert.ok(data.listings.length > 0);

    // Pick top sample listings across verticals
    const sampleListings = data.listings.slice(0, 5);
    for (const item of sampleListings) {
      const resolved = await getResidentOrganization(item.slug || item.id);
      assert.ok(resolved, `Listing ${item.name} (${item.slug}) should be resolved by slug/id`);
      assert.ok(resolved.orgId, `Resolved listing must have canonical orgId`);

      const org = await getCanonicalOrganization(resolved.orgId);
      assert.ok(org, `Canonical organization must be loaded for orgId ${resolved.orgId}`);
      assert.equal(typeof org.name, 'string');

      // Assert full JSON serializability (no Temporal.Instant or raw class methods across RSC boundary)
      const serialized = JSON.stringify(org);
      assert.ok(serialized.length > 0, 'Organization payload must serialize cleanly to JSON');
      const parsed = JSON.parse(serialized);
      assert.equal(parsed.id, org.id);
    }
  });
});
