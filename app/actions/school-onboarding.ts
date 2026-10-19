'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';

function toTemporal(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

export async function createSchool(data: {
  name: string;
  shortName?: string;
  address?: string;
  state?: string;
  lga?: string;
  phone?: string;
  email?: string;
  slug: string;
  tagline?: string;
  academicYear: number;
  termStructure: 'SEMESTER' | 'TRIMESTER';
  gradingScale: 'LETTER' | 'PERCENTAGE';
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized');
  }

  const trimmedName = (data.name || '').trim();
  const cleanSlug = (data.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!trimmedName || !cleanSlug) {
    throw new Error('School name and web address are required.');
  }

  // 1. Check if slug is taken
  const existingMicrosite = await db.orm.public.Microsite.where({ slug: cleanSlug }).all().first();
  if (existingMicrosite) {
    throw new Error('This web address is already taken. Please choose another.');
  }

  const city = await db.orm.public.City.where({ isActive: true }).all().first();
  if (!city) {
    throw new Error('No active city found in the registry.');
  }

  // 2. Perform everything in a transaction
  const organizationId = await db.transaction(async (tx: any) => {
    // A. Create Organization
    const org = await tx.orm.public.Organization.create({
      name: trimmedName,
      type: 'SCHOOL' as any,
      description: data.tagline || 'A new school on 9jaLive.',
      address: data.address || city.name,
    });

    // B. Create Location, Wallet, and DiscoveryListing
    const location = await tx.orm.public.Location.create({
      organizationId: org.id,
      name: data.shortName || 'Main Campus',
      address: data.address || city.name,
      cityId: city.id,
    });

    await tx.orm.public.Wallet.create({
      organizationId: org.id,
      balance: 0.0,
      currency: city.currency || 'NGN',
    });

    const listingSlug = `${cleanSlug}-${org.id.slice(0, 8)}`;
    await tx.orm.public.DiscoveryListing.create({
      organizationId: org.id,
      locationId: location.id,
      cityId: city.id,
      vertical: 'SCHOOL',
      slug: listingSlug,
      title: trimmedName,
      description: data.tagline || data.address || null,
      isActive: true,
    });

    // C. Create Microsite
    await tx.orm.public.Microsite.create({
      organizationId: org.id,
      slug: cleanSlug,
      title: trimmedName,
      tagline: data.tagline || null,
      theme: 'minimal',
      status: 'published',
    });

    // D. Create SchoolSettings
    await tx.orm.public.SchoolSettings.create({
      organizationId: org.id,
      name: trimmedName,
      shortName: data.shortName || trimmedName.slice(0, 8).toUpperCase(),
      address: data.address || null,
      state: data.state || null,
      lga: data.lga || null,
      phone: data.phone || null,
      email: data.email || null,
      currentYear: data.academicYear,
    });

    // E. Membership & Role
    const membership = await tx.orm.public.Membership.create({
      organizationId: org.id,
      personId: session.user.personId as string,
    });

    await tx.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
    });

    await tx.orm.public.MembershipLocation.create({
      membershipId: membership.id,
      locationId: location.id,
    });

    // F. Academic Year & Terms (using Temporal.Instant for Prisma 8 DateTime)
    const startYear = data.academicYear;
    const academicYear = await tx.orm.public.AcademicYear.create({
      organizationId: org.id,
      year: startYear,
      startDate: toTemporal(new Date(`${startYear}-09-01T00:00:00Z`)),
      endDate: toTemporal(new Date(`${startYear + 1}-07-31T00:00:00Z`)),
      active: true,
    });

    const numTerms = data.termStructure === 'TRIMESTER' ? 3 : 2;
    for (let i = 1; i <= numTerms; i++) {
      let tName = '';
      let tStart = new Date();
      let tEnd = new Date();

      if (numTerms === 3) {
        tName = i === 1 ? 'First Term' : i === 2 ? 'Second Term' : 'Third Term';
        if (i === 1) { tStart = new Date(`${startYear}-09-01T00:00:00Z`); tEnd = new Date(`${startYear}-12-15T00:00:00Z`); }
        if (i === 2) { tStart = new Date(`${startYear + 1}-01-05T00:00:00Z`); tEnd = new Date(`${startYear + 1}-03-30T00:00:00Z`); }
        if (i === 3) { tStart = new Date(`${startYear + 1}-04-15T00:00:00Z`); tEnd = new Date(`${startYear + 1}-07-20T00:00:00Z`); }
      } else {
        tName = i === 1 ? 'Fall Semester' : 'Spring Semester';
        if (i === 1) { tStart = new Date(`${startYear}-09-01T00:00:00Z`); tEnd = new Date(`${startYear + 1}-01-15T00:00:00Z`); }
        if (i === 2) { tStart = new Date(`${startYear + 1}-01-20T00:00:00Z`); tEnd = new Date(`${startYear + 1}-06-15T00:00:00Z`); }
      }

      await tx.orm.public.Term.create({
        organizationId: org.id,
        academicYearId: academicYear.id,
        termNumber: i,
        name: tName,
        startDate: toTemporal(tStart),
        endDate: toTemporal(tEnd),
      });
    }

    // G. Grading Scale
    const scale = await tx.orm.public.GradingScale.create({
      organizationId: org.id,
      name: data.gradingScale === 'LETTER' ? 'Standard A-F' : 'Percentage',
      isDefault: true,
    });

    if (data.gradingScale === 'LETTER') {
      const letters = [
        { label: 'A', min: 90, max: 100, gpa: 4.0 },
        { label: 'B', min: 80, max: 89, gpa: 3.0 },
        { label: 'C', min: 70, max: 79, gpa: 2.0 },
        { label: 'D', min: 60, max: 69, gpa: 1.0 },
        { label: 'F', min: 0, max: 59, gpa: 0.0 },
      ];
      for (const l of letters) {
        await tx.orm.public.GradeBoundary.create({
          gradingScaleId: scale.id,
          label: l.label,
          minPercent: l.min,
          maxPercent: l.max,
        });
      }
    } else {
      await tx.orm.public.GradeBoundary.create({
        gradingScaleId: scale.id,
        label: 'Pass',
        minPercent: 50,
        maxPercent: 100,
      });
      await tx.orm.public.GradeBoundary.create({
        gradingScaleId: scale.id,
        label: 'Fail',
        minPercent: 0,
        maxPercent: 49,
      });
    }

    return org.id;
  });

  return { success: true, organizationId };
}
