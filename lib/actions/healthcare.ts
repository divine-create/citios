
'use server'

import { db } from '@/src/prisma/db'
import { requireMembership } from '@/lib/actions/tenant'

export async function getHealthcareAdminData(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const clinic = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    if (!clinic) return null;

    const appointments = await db.orm.public.Appointment.where({ organizationId: clinic.id }).all();
    const prescriptions = await db.orm.public.Prescription.where({ organizationId: clinic.id }).all();
    const pharmacyItems = await db.orm.public.PharmacyItem.where({ organizationId: clinic.id }).all();

    // Hydrate patient names: PatientData -> Relationship -> Person
    async function resolvePatientName(patientDataId: string): Promise<string> {
      const pd = await db.orm.public.PatientData.where({ id: patientDataId }).all().first();
      if (!pd) return 'Unknown';
      const rel = await db.orm.public.Relationship.where({ id: pd.relationshipId }).all().first();
      if (!rel) return 'Unknown';
      const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
      return person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown';
    }

    const appointmentsWithPatients = await Promise.all(
      appointments.map(async (apt) => ({
        ...apt,
        patientName: await resolvePatientName(apt.patientDataId),
      }))
    );

    const prescriptionsWithPatients = await Promise.all(
      prescriptions.map(async (px) => ({
        ...px,
        patientName: await resolvePatientName(px.patientDataId),
      }))
    );

    return JSON.parse(JSON.stringify({
      clinic, pharmacy: clinic,
      appointments: appointmentsWithPatients,
      prescriptions: prescriptionsWithPatients,
      pharmacyItems,
    }));
  } catch (error) {
    console.error('Error fetching healthcare data:', error);
    return null;
  }
}

export async function getHealthcareSpecialties() {
  return [
    { id: '1', name: 'Primary Care', icon: 'Stethoscope' },
    { id: '2', name: 'Dentist', icon: 'Activity' },
    { id: '3', name: 'Dermatologist', icon: 'Sun' },
    { id: '4', name: 'Therapist', icon: 'Brain' },
    { id: '5', name: 'Eye Doctor', icon: 'Eye' },
  ];
}

export async function searchHealthcareProviders(query?: string, specialty?: string) {
  return [
    {
      id: 'doc-1',
      name: 'Dr. Sarah Jenkins, MD',
      specialty: 'Primary Care',
      rating: 4.9,
      reviews: 342,
      imageUrl: 'https://i.pravatar.cc/150?u=sarah',
      certifications: ['Board Certified in Family Medicine'],
      languages: ['English', 'Spanish'],
      nextAvailable: 'Today',
      location: 'Downtown Medical Center (0.8 mi)',
      availability: [
        { date: 'Today', slots: ['10:00 AM', '1:30 PM', '4:00 PM'] },
        { date: 'Tomorrow', slots: ['9:00 AM', '11:15 AM', '3:45 PM'] },
      ],
    },
    {
      id: 'doc-2',
      name: 'Dr. Michael Chen, DDS',
      specialty: 'Dentist',
      rating: 4.8,
      reviews: 128,
      imageUrl: 'https://i.pravatar.cc/150?u=michael',
      certifications: ['American Board of Pediatric Dentistry'],
      languages: ['English', 'Mandarin'],
      nextAvailable: 'Tomorrow',
      location: 'Smile Dental (1.2 mi)',
      availability: [
        { date: 'Tomorrow', slots: ['8:00 AM', '10:30 AM', '2:00 PM', '4:30 PM'] },
        { date: 'Wed, Oct 18', slots: ['9:00 AM', '1:00 PM'] },
      ],
    },
    {
      id: 'doc-3',
      name: 'Dr. Emily Rodriguez, MD',
      specialty: 'Dermatologist',
      rating: 4.7,
      reviews: 89,
      imageUrl: 'https://i.pravatar.cc/150?u=emily',
      certifications: ['American Board of Dermatology'],
      languages: ['English'],
      nextAvailable: 'Today',
      location: 'Skin Health Associates (2.5 mi)',
      availability: [
        { date: 'Today', slots: ['3:15 PM'] },
        { date: 'Tomorrow', slots: ['10:00 AM', '11:30 AM', '2:45 PM'] },
      ],
    },
  ];
}

export async function bookAppointment(
  organizationId: string,
  patientDataId: string,
  staffMembershipId: string,
  date: string,
  reason: string
) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'DOCTOR']);
    const appointment = await db.orm.public.Appointment.create({
      organizationId,
      patientDataId,
      staffMembershipId,
      date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(new Date(date).getTime()),
      reason,
      status: 'SCHEDULED',
    });
    return { success: true, appointment: JSON.parse(JSON.stringify(appointment)) };
  } catch (error) {
    console.error('Error booking appointment:', error);
    return { error: 'Failed to book appointment.' };
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
) {
  try {
    const apt = await db.orm.public.Appointment.where({ id: appointmentId }).all().first();
    if (apt) await requireMembership(apt.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'DOCTOR']);
    await db.orm.public.Appointment.where({ id: appointmentId }).update({ status });
    return { success: true };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return { error: 'Failed to update appointment.' };
  }
}

export async function issuePrescription(input: {
  organizationId: string;
  patientDataId: string;
  medication: string;
  dosage: string;
  instructions?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'DOCTOR']);
    const prescription = await db.orm.public.Prescription.create({
      organizationId: input.organizationId,
      patientDataId: input.patientDataId,
      medication: input.medication,
      dosage: input.dosage,
      instructions: input.instructions,
      status: 'ISSUED',
    });
    return { success: true, prescription: JSON.parse(JSON.stringify(prescription)) };
  } catch (error) {
    console.error('Error issuing prescription:', error);
    return { error: 'Failed to issue prescription.' };
  }
}

export async function updatePrescriptionStatus(
  prescriptionId: string,
  status: 'ISSUED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
) {
  try {
    const px = await db.orm.public.Prescription.where({ id: prescriptionId }).all().first();
    if (px) await requireMembership(px.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'DOCTOR', 'PHARMACIST']);
    await db.orm.public.Prescription.where({ id: prescriptionId }).update({ status });
    return { success: true };
  } catch (error) {
    console.error('Error updating prescription:', error);
    return { error: 'Failed to update prescription.' };
  }
}


