import { Suspense } from 'react';
import BusinessDashboard from '@/components/cityos/BusinessDashboard';

export default function BusinessDashboardPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm font-bold text-slate-400">Loading business hub...</div>}>
            <BusinessDashboard />
        </Suspense>
    );
}