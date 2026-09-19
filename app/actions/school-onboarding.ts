'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { OrgType } from '@/types/next-auth'; // Or string if not exported

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

  // 1. Check if slug is taken
  // @ts-ignore
  const existingMicrosite = await db.orm.public.Microsite.where({ slug: data.slug }).all().first();
  if (existingMicrosite) {
    throw new Error('This web address is already taken. Please choose another.');
  }

  // 2. Perform everything in a transaction
  await db.transaction(async (tx) => {
    // A. Create Organization
    const org = await tx.public.Organization.create({
      name: data.name,
      // @ts-ignore
      type: 'SCHOOL',
      description: data.tagline || 'A new school on CityConnect.',
    });

    // B. Create Microsite
    await tx.public.Microsite.create({
      organizationId: org.id,
      slug: data.slug,
      title: data.name,
      tagline: data.tagline,
      theme: 'minimal',
      status: 'published',
    });

    // C. Create SchoolSettings
    await tx.public.SchoolSettings.create({
      organizationId: org.id,
      name: data.name,
      shortName: data.shortName,
      address: data.address,
      state: data.state,
      lga: data.lga,
      phone: data.phone,
      email: data.email,
    });

    // D. Membership & Role
    const membership = await tx.public.Membership.create({
      organizationId: org.id,
      personId: session.user.personId as string,
    });

    await tx.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
    });

    // E. Academic Year & Terms
    const startYear = data.academicYear;
    const academicYear = await tx.public.AcademicYear.create({
      organizationId: org.id,
      year: startYear,
      startDate: new Date(`${startYear}-09-01`),
      endDate: new Date(`${startYear + 1}-07-31`),
      active: true,
    });

    const numTerms = data.termStructure === 'TRIMESTER' ? 3 : 2;
    for (let i = 1; i <= numTerms; i++) {
      let tName = '';
      let tStart = new Date();
      let tEnd = new Date();

      if (numTerms === 3) {
        tName = i === 1 ? 'First Term' : i === 2 ? 'Second Term' : 'Third Term';
        if (i === 1) { tStart = new Date(`${startYear}-09-01`); tEnd = new Date(`${startYear}-12-15`); }
        if (i === 2) { tStart = new Date(`${startYear + 1}-01-05`); tEnd = new Date(`${startYear + 1}-03-30`); }
        if (i === 3) { tStart = new Date(`${startYear + 1}-04-15`); tEnd = new Date(`${startYear + 1}-07-20`); }
      } else {
        tName = i === 1 ? 'Fall Semester' : 'Spring Semester';
        if (i === 1) { tStart = new Date(`${startYear}-09-01`); tEnd = new Date(`${startYear + 1}-01-15`); }
        if (i === 2) { tStart = new Date(`${startYear + 1}-01-20`); tEnd = new Date(`${startYear + 1}-06-15`); }
      }

      await tx.public.Term.create({
        organizationId: org.id,
        academicYearId: academicYear.id,
        termNumber: i,
        name: tName,
        startDate: tStart,
        endDate: tEnd,
      });
    }

    // F. Grading Scale
    const scale = await tx.public.GradingScale.create({
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
        await tx.public.GradeBoundary.create({
          gradingScaleId: scale.id,
          label: l.label,
          minScore: l.min,
          maxScore: l.max,
          gpaValue: l.gpa,
        });
      }
    } else {
      await tx.public.GradeBoundary.create({
        gradingScaleId: scale.id,
        label: 'Pass',
        minScore: 50,
        maxScore: 100,
        gpaValue: 4.0,
      });
      await tx.public.GradeBoundary.create({
        gradingScaleId: scale.id,
        label: 'Fail',
        minScore: 0,
        maxScore: 49,
        gpaValue: 0.0,
      });
    }
  });

  return { success: true };
}
