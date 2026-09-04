'use server'

import { db } from '@/src/prisma/db'

export async function getSchoolAdminData() {
  try {
    const school = await db.orm.public.Organization.where({ type: 'SCHOOL' }).all().first();

    if (!school) return null;

    const students = await db.orm.public.Student.where({ organizationId: school.id }).all();
    const courses = await db.orm.public.Course.where({ organizationId: school.id }).all();
    
    // We fetch attendance for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Get attendance records
    const attendanceRecordsData = await db.orm.public.AttendanceRecord.all();
    const attendanceRecords = attendanceRecordsData
        .filter(r => new Date(r.date.toString()) >= startOfToday)
        .map(r => {
            return {
                ...r,
                student: students.find(s => s.id === r.studentId)
            }
        })
        .filter(r => r.student);

    return JSON.parse(JSON.stringify({
      school,
      students,
      courses,
      attendanceRecords
    }));
  } catch (error) {
    console.error('Error fetching school data:', error);
    return null;
  }
}
