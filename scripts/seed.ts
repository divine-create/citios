import '@js-temporal/polyfill';
import { db } from '../src/prisma/db.js';

type OrgType = Awaited<ReturnType<typeof db.orm.public.Organization.all>>[number]['type'];

// Idempotent: one Organization per OrgType. Re-running this script must never
// create duplicates (it used to, before this guard existed, and that made a
// mess of the "one org per vertical" assumption every lib/actions/*.ts file
// relies on). Child data (rooms, courses, menu items, ...) is only created
// the first time an org is created, so re-runs are a safe no-op per vertical.
async function findOrCreateOrg(type: OrgType, data: { name: string; description?: string }) {
  const existing = await db.orm.public.Organization.where({ type }).all().first();
  if (existing) return { org: existing, created: false as const };

  const org = await db.orm.public.Organization.create({ type, ...data });
  return { org, created: true as const };
}

async function main() {
  console.log('Seeding database...');

  let adminUser = await db.orm.public.User.where({ email: 'admin@cityconnect.local' }).all().first();
  if (!adminUser) {
    adminUser = await db.orm.public.User.create({
      name: 'City Planner',
      email: 'admin@cityconnect.local',
    });
  }

  // ---------------------------------------------------------------------
  // Hotel
  // ---------------------------------------------------------------------
  const { org: hotel, created: hotelCreated } = await findOrCreateOrg('HOTEL', {
    name: 'The Grand City Hotel',
    description: 'Luxury accommodations in the heart of the city.',
  });

  if (hotelCreated) {
    const room101 = await db.orm.public.HotelRoom.create({
      roomNumber: '101',
      type: 'King',
      status: 'CLEAN',
      organizationId: hotel.id,
    });

    await db.orm.public.HotelRoom.create({
      roomNumber: '102',
      type: 'King',
      status: 'DIRTY',
      organizationId: hotel.id,
    });

    await db.orm.public.HotelRoom.create({
      roomNumber: '103',
      type: 'Double',
      status: 'INSPECTING',
      organizationId: hotel.id,
    });

    await db.orm.public.HotelRoom.create({
      roomNumber: '104',
      type: 'Suite',
      status: 'OUT_OF_ORDER',
      organizationId: hotel.id,
    });

    await db.orm.public.Reservation.create({
      guestName: 'John Doe',
      roomId: room101.id,
      status: 'CHECKED_IN',
      checkInDate: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() - 86400000), // Yesterday
      checkOutDate: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000), // Tomorrow
      organizationId: hotel.id,
    });
  }

  // ---------------------------------------------------------------------
  // School
  // ---------------------------------------------------------------------
  const { org: school, created: schoolCreated } = await findOrCreateOrg('SCHOOL', {
    name: 'Lincoln High School',
    description: 'Home of the Lions',
  });

  if (schoolCreated) {
    const teacher = await db.orm.public.OrganizationMember.create({
      userId: adminUser.id,
      organizationId: school.id,
      role: 'TEACHER',
    });

    const mathCourse = await db.orm.public.Course.create({
      name: 'Advanced Calculus',
      roomNumber: 'Room 302',
      teacherId: teacher.id,
      organizationId: school.id,
    });

    const student1 = await db.orm.public.Student.create({
      firstName: 'Alex',
      lastName: 'Johnson',
      gradeLevel: 'Grade 10',
      organizationId: school.id,
    });

    const student2 = await db.orm.public.Student.create({
      firstName: 'Zoe',
      lastName: 'Smith',
      gradeLevel: 'Grade 11',
      organizationId: school.id,
    });

    await db.orm.public.CourseEnrollment.create({
      studentId: student1.id,
      courseId: mathCourse.id,
      grade: 88.5,
    });

    await db.orm.public.AttendanceRecord.create({
      studentId: student1.id,
      status: 'PRESENT',
    });

    await db.orm.public.AttendanceRecord.create({
      studentId: student2.id,
      status: 'LATE',
    });
  }

  // ---------------------------------------------------------------------
  // Restaurant
  // ---------------------------------------------------------------------
  const { org: restaurant, created: restaurantCreated } = await findOrCreateOrg('RESTAURANT', {
    name: 'Downtown Burger Bar',
    description: 'Best burgers in the city.',
  });

  if (restaurantCreated) {
    const burger = await db.orm.public.MenuItem.create({
      name: 'Classic Cheeseburger',
      description: '1/4 lb beef patty with cheddar cheese, lettuce, and tomato.',
      price: 12.99,
      category: 'Mains',
      organizationId: restaurant.id,
    });

    const fries = await db.orm.public.MenuItem.create({
      name: 'Truffle Fries',
      description: 'Crispy fries tossed in truffle oil and parmesan.',
      price: 6.99,
      category: 'Sides',
      organizationId: restaurant.id,
    });

    const soda = await db.orm.public.MenuItem.create({
      name: 'Craft Cola',
      price: 3.5,
      category: 'Drinks',
      organizationId: restaurant.id,
    });

    const order = await db.orm.public.RestaurantOrder.create({
      organizationId: restaurant.id,
      residentId: adminUser.id,
      type: 'DINE_IN',
      tableNumber: 'Table 4',
      status: 'PREPARING',
      totalAmount: 23.48,
    });

    await db.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: burger.id,
      quantity: 1,
      notes: 'No pickles',
    });

    await db.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: fries.id,
      quantity: 1,
    });

    await db.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: soda.id,
      quantity: 1,
    });
  }

  // ---------------------------------------------------------------------
  // Events & Rentals
  // ---------------------------------------------------------------------
  const { org: organizer, created: organizerCreated } = await findOrCreateOrg('EVENT_ORGANIZER', {
    name: 'City Parks & Rec',
    description: 'Managing public spaces and community events.',
  });

  if (organizerCreated) {
    const summerFest = await db.orm.public.Event.create({
      title: 'Summer Music Festival',
      description: 'Live bands, food trucks, and family fun.',
      location: 'Centennial Park',
      date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000 * 14), // In 2 weeks
      capacity: 5000,
      price: 15.0,
      organizationId: organizer.id,
    });

    await db.orm.public.Ticket.create({
      eventId: summerFest.id,
      userId: adminUser.id,
      status: 'VALID',
    });

    const pavilion = await db.orm.public.RentalResource.create({
      name: 'Centennial Park Main Pavilion',
      description: 'Large covered area with picnic tables and grills.',
      type: 'VENUE',
      pricePerDay: 150.0,
      organizationId: organizer.id,
    });

    await db.orm.public.Booking.create({
      resourceId: pavilion.id,
      userId: adminUser.id,
      startDate: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000 * 5),
      endDate: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000 * 5),
      status: 'CONFIRMED',
      totalPrice: 150.0,
    });
  }

  // ---------------------------------------------------------------------
  // Publisher / News
  // ---------------------------------------------------------------------
  const { org: publisher, created: publisherCreated } = await findOrCreateOrg('PUBLISHER', {
    name: 'The Daily Chronicle',
    description: 'Your trusted source for local news and updates.',
  });

  if (publisherCreated) {
    const post1 = await db.orm.public.Post.create({
      title: 'City Council Approves New Tech Hub',
      content:
        'In a unanimous vote, the city council has approved the construction of a new 50-acre tech hub downtown, expected to bring 5,000 new jobs.',
      category: 'Politics',
      isEmergency: false,
      status: 'PUBLISHED',
      viewCount: 1204,
      organizationId: publisher.id,
    });

    await db.orm.public.Post.create({
      title: 'SEVERE WEATHER ALERT: Flash Flooding',
      content:
        'The National Weather Service has issued a flash flood warning for the downtown and riverfront areas until 8 PM tonight. Please avoid unnecessary travel.',
      category: 'Weather',
      isEmergency: true,
      status: 'PUBLISHED',
      viewCount: 5600,
      organizationId: publisher.id,
    });

    await db.orm.public.Post.create({
      title: 'Local High School Wins State Championship',
      content:
        'The Lincoln High Lions secured a stunning 3-2 victory in overtime to claim their first state soccer championship in two decades.',
      category: 'Sports',
      isEmergency: false,
      status: 'DRAFT',
      viewCount: 0,
      organizationId: publisher.id,
    });

    await db.orm.public.Comment.create({
      content: 'This is amazing news for the local economy! I cannot wait.',
      postId: post1.id,
      userId: adminUser.id,
    });
  }

  // ---------------------------------------------------------------------
  // Healthcare & Pharmacy
  // ---------------------------------------------------------------------
  const { org: clinic, created: clinicCreated } = await findOrCreateOrg('HEALTHCARE', {
    name: 'City General Clinic',
    description: 'Providing excellent care to the community.',
  });

  const { org: pharmacy, created: pharmacyCreated } = await findOrCreateOrg('PHARMACY', {
    name: 'Downtown Pharmacy',
    description: 'Your local trusted pharmacy.',
  });

  if (clinicCreated) {
    const doctor = await db.orm.public.OrganizationMember.create({
      userId: adminUser.id,
      organizationId: clinic.id,
      role: 'DOCTOR',
    });

    await db.orm.public.Appointment.create({
      date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000), // Tomorrow
      reason: 'Annual Checkup',
      status: 'SCHEDULED',
      patientId: adminUser.id,
      doctorId: doctor.id,
      organizationId: clinic.id,
    });

    await db.orm.public.Prescription.create({
      medication: 'Amoxicillin 500mg',
      dosage: 'Take 1 pill every 8 hours',
      instructions: 'Take with food.',
      status: 'ISSUED',
      patientId: adminUser.id,
      organizationId: clinic.id,
    });
  }

  if (pharmacyCreated) {
    await db.orm.public.PharmacyItem.create({
      name: 'Ibuprofen 400mg',
      description: 'Pain relief and fever reduction',
      price: 8.99,
      category: 'OTC',
      stockLevel: 150,
      requiresPrescription: false,
      organizationId: pharmacy.id,
    });

    await db.orm.public.PharmacyItem.create({
      name: 'Amoxicillin 500mg',
      description: 'Antibiotic',
      price: 15.5,
      category: 'Prescription',
      stockLevel: 50,
      requiresPrescription: true,
      organizationId: pharmacy.id,
    });
  }

  // ---------------------------------------------------------------------
  // Logistics / CityDrive dispatch
  // ---------------------------------------------------------------------
  const { org: logisticsOrg, created: logisticsCreated } = await findOrCreateOrg('LOGISTICS', {
    name: 'CityConnect Fleet Services',
    description: 'Unified dispatch for local services and deliveries.',
  });

  if (logisticsCreated) {
    await db.orm.public.GigWorkerProfile.where({ userId: adminUser.id }).all().first().then(async (existing) => {
      if (!existing) {
        await db.orm.public.GigWorkerProfile.create({
          userId: adminUser.id, // Reusing admin as a worker for simplicity
          vehicleType: 'CAR',
          licensePlate: 'ABC-1234',
          isOnline: true,
          rating: 4.8,
        });
      }
    });

    const task1 = await db.orm.public.Task.create({
      type: 'PACKAGE_DELIVERY',
      status: 'PENDING',
      pickupAddress: 'Downtown Pharmacy',
      dropoffAddress: '123 Main St, Apt 4B',
      price: 12.5,
      requesterId: adminUser.id,
      organizationId: logisticsOrg.id,
    });

    const task2 = await db.orm.public.Task.create({
      type: 'SERVICE_DISPATCH',
      status: 'ACCEPTED',
      pickupAddress: 'Not Applicable',
      dropoffAddress: '456 Oak Lane',
      price: 0.0, // TBD by quote
      requesterId: adminUser.id,
      courierId: adminUser.id, // Handled by this worker
      organizationId: logisticsOrg.id,
    });
    void task1;

    await db.orm.public.ServiceQuote.create({
      taskId: task2.id,
      providerId: adminUser.id,
      estimatedPrice: 150.0,
      notes: 'Plumbing leak repair. Will take approx 2 hours.',
      status: 'PENDING',
    });
  }

  // ---------------------------------------------------------------------
  // Retail / Grocery (CityMall) — org only for now; no data layer built yet
  // for inventory/orders, the admin UI is still fully mocked client-side.
  // ---------------------------------------------------------------------
  await findOrCreateOrg('RETAIL', {
    name: 'Corner Market Grocers',
    description: 'Neighborhood grocery store on CityMall.',
  });

  console.log('Database seeded successfully!');
  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
