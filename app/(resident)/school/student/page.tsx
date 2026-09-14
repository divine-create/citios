import { StudentDashboard } from "@/components/school/StudentDashboard";
import { getStudentPortalData } from "@/lib/actions/school";

export const metadata = {
  title: "Student Portal - School Management System",
  description: "View your academic dashboard and attendance.",
};

export default async function StudentPage() {
  const data = await getStudentPortalData();

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <StudentDashboard initialData={data} />
    </main>
  );
}
