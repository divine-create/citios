import { CounselorDashboard } from "@/components/school/CounselorDashboard";
import { requireOrgAccess } from '@/lib/rbac';

export default async function CounselorPage() {
  await requireOrgAccess('SCHOOL');
  return (
    <main className="h-full bg-slate-50">
      <CounselorDashboard />
    </main>
  );
}
