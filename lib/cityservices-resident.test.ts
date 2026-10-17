import test from 'node:test';
import assert from 'node:assert/strict';
import { inferServiceCategory } from '@/lib/service-categories';
import { getCityBookableServices } from './actions/service';
import { bookResidentService } from '@/app/actions/service';

test('CityServices Resident Discovery and Booking Suite', async (t) => {
  await t.test('1. inferServiceCategory correctly categorizes diverse services', () => {
    // Trades & Repair
    assert.equal(inferServiceCategory('Air Conditioner Repair', 'Full AC troubleshooting and refrigerant recharge'), 'Trades & Repair');
    assert.equal(inferServiceCategory('Plumbing Leak Fix', 'Pipes and water pump repair'), 'Trades & Repair');
    assert.equal(inferServiceCategory('Electrician Wiring & Fuse Replacement', 'Certified electrical services'), 'Trades & Repair');
    assert.equal(inferServiceCategory('Carpentry Furniture Polish', 'Cabinet and door fixing'), 'Trades & Repair');

    // Home & Cleaning
    assert.equal(inferServiceCategory('Deep Home Cleaning', 'Kitchen, bedrooms, and floor scrub'), 'Home & Cleaning');
    assert.equal(inferServiceCategory('Post-Construction Fumigation', 'Pest eradication'), 'Home & Cleaning');
    assert.equal(inferServiceCategory('Laundry & Dry Cleaning', 'Wash, fold and iron package'), 'Home & Cleaning');

    // Tech & Solar
    assert.equal(inferServiceCategory('5kVA Solar Inverter Setup', 'Solar panel mounting and lithium battery wiring'), 'Tech & Solar');
    assert.equal(inferServiceCategory('CCTV Camera Installation', '4-channel IP security cameras'), 'Tech & Solar');
    assert.equal(inferServiceCategory('Laptop Screen Replacement', 'MacBook and Dell screen repair'), 'Tech & Solar');

    // Automotive & Power
    assert.equal(inferServiceCategory('Car Oil Change & Brake Service', 'Engine lube and brake shoe overhaul'), 'Automotive & Power');
    assert.equal(inferServiceCategory('Heavy Duty Generator Servicing', 'Mikano and Lister engine maintenance'), 'Automotive & Power');
    assert.equal(inferServiceCategory('Mobile Mechanic Engine Diagnostic', 'OBD2 computer scanning'), 'Automotive & Power');

    // Beauty & Wellness
    assert.equal(inferServiceCategory('Bridal Hair Styling & Braiding', 'Knotless braids and frontal install'), 'Beauty & Wellness');
    assert.equal(inferServiceCategory('Manicure and Pedicure Spa', 'Nail care and massage'), 'Beauty & Wellness');
    assert.equal(inferServiceCategory('Men Barbering and Fade', 'Haircut and beard grooming'), 'Beauty & Wellness');

    // Health & Care
    assert.equal(inferServiceCategory('Home Nursing & Elderly Care', 'Daily vital checks and nursing assistance'), 'Health & Care');
    assert.equal(inferServiceCategory('Physiotherapy Session', 'Post-stroke rehab'), 'Health & Care');

    // Fallback
    assert.equal(inferServiceCategory('Generic Uncategorized Task', 'A simple task'), 'General Services');
  });

  await t.test('2. getCityBookableServices returns services with category and provider details', async () => {
    const services = await getCityBookableServices('calabar');
    assert.ok(Array.isArray(services), 'Should return an array of services');

    if (services.length > 0) {
      const first = services[0];
      assert.ok(first.id, 'Service item should have an id');
      assert.ok(first.name, 'Service item should have a name');
      assert.equal(typeof first.price, 'number', 'Price should be a number');
      assert.ok(first.organizationId, 'Service item should have an organizationId');
      assert.ok(first.orgName, 'Service item should have orgName');
      assert.ok(first.category, 'Service item should have an assigned category');
      assert.ok('whatsapp' in first, 'Service item should include whatsapp property');
      assert.ok('phone' in first, 'Service item should include phone property');
      assert.ok('reviewCount' in first, 'Service item should include reviewCount');
      assert.ok('likesCount' in first, 'Service item should include likesCount');
      assert.ok('userHasLiked' in first, 'Service item should include userHasLiked');
    }
  });

  await t.test('3. bookResidentService requires authentication for anonymous calls', async () => {
    const res = await bookResidentService({
      serviceId: 'dummy-service-id',
      date: '2026-10-25',
      timeSlot: '10:00',
      address: '14 Marian Road, Calabar',
      notes: 'Please bring testing equipment',
    });

    assert.equal(res.success, false, 'Unauthenticated call should not succeed');
    assert.equal(res.requiresAuth, true, 'Should indicate requiresAuth: true');
    assert.ok(res.error, 'Should provide user-facing error message');
  });

  await t.test('4. bookResidentService validates input parameters', async () => {
    const res = await bookResidentService({
      serviceId: '',
      date: '',
      timeSlot: '',
      address: '',
    });

    assert.equal(res.success, false, 'Empty call should fail');
    assert.ok(res.error, 'Should return validation error');
  });

  await t.test('5. Service reviews and likes require authentication', async () => {
    const { submitOrganizationReview, toggleOrganizationLike, getOrganizationReviews } = await import('@/lib/actions/service');

    const revRes = await submitOrganizationReview({
      organizationId: 'dummy-org-id',
      rating: 5,
      body: 'Excellent and timely work!',
    });
    assert.equal(revRes.success, false, 'Anonymous review submission must fail');
    assert.equal(revRes.requiresAuth, true, 'Should flag requiresAuth: true');

    const likeRes = await toggleOrganizationLike('dummy-org-id');
    assert.equal(likeRes.success, false, 'Anonymous like toggle must fail');
    assert.equal(likeRes.requiresAuth, true, 'Should flag requiresAuth: true');

    const publicReviews = await getOrganizationReviews('dummy-org-id');
    assert.equal(publicReviews.success, true, 'Public review fetching should succeed gracefully');
    assert.ok(Array.isArray(publicReviews.reviews), 'Should return reviews array');
  });
});

