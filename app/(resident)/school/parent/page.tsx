import ParentDashboard from "@/components/school/ParentDashboard";
import { getParentPortalData } from "@/lib/actions/school";

export const metadata = {
  title: "Parent Portal - School Management System",
  description: "View your children's grades, attendance, and fees.",
};

export default async function ParentPortalPage() {
  const data = await getParentPortalData();

  return (
    <main className="min-h-screen bg-slate-50">
      <ParentDashboard initialData={data} />
    </main>
  );
}
