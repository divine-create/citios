import { StudentDashboard } from "@/components/school/StudentDashboard";

export const metadata = {
  title: "Student Portal - School Management System",
  description: "View your academic dashboard, timetable, and extracurriculars.",
};

export default function StudentPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <StudentDashboard />
    </main>
  );
}
