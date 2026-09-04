
'use server'

import { db } from '@/src/prisma/db'

export async function getHealthcareAdminData() {
  try {
    const clinic = await db.orm.public.Organization.where({ type: 'HEALTHCARE' }).all().first();
    const pharmacy = await db.orm.public.Organization.where({ type: 'PHARMACY' }).all().first();

    if (!clinic || !pharmacy) return null;

    const appointments = await db.orm.public.Appointment.where({ organizationId: clinic.id }).all();
    const prescriptions = await db.orm.public.Prescription.where({ organizationId: clinic.id }).all();
    const pharmacyItems = await db.orm.public.PharmacyItem.where({ organizationId: pharmacy.id }).all();
    
    // Stitch patient data
    const users = await db.orm.public.User.all();

    const appointmentsWithPatients = appointments.map(apt => ({
        ...apt,
        patient: users.find(u => u.id === apt.patientId)
    }));
    
    const prescriptionsWithPatients = prescriptions.map(px => ({
        ...px,
        patient: users.find(u => u.id === px.patientId)
    }));

    return JSON.parse(JSON.stringify({
      clinic,
      pharmacy,
      appointments: appointmentsWithPatients,
      prescriptions: prescriptionsWithPatients,
      pharmacyItems
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
        { date: 'Tomorrow', slots: ['9:00 AM', '11:15 AM', '3:45 PM'] }
      ]
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
        { date: 'Wed, Oct 18', slots: ['9:00 AM', '1:00 PM'] }
      ]
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
        { date: 'Tomorrow', slots: ['10:00 AM', '11:30 AM', '2:45 PM'] }
      ]
    }
  ];
}

export async function bookAppointment(providerId: string, date: string, time: string, reason: string) {
  console.log('Booking appointment with', providerId, 'on', date, 'at', time, 'for', reason);
  return { success: true, message: 'Appointment booked successfully!' };
}

