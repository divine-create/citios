import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import { getCityJobs } from '@/app/actions/org';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityJobsList from '@/components/cityos/CityJobsList';

export const dynamic = 'force-dynamic';

export default async function CityJobsPage() {
  const [config, jobs] = await Promise.all([
    getVerticalsConfig(),
    getCityJobs(),
  ]);

  if (!config.jobs) {
    return <VerticalPausedNotice verticalName="Jobs" verticalId="jobs" />;
  }

  return (
    <div className="py-6">
      <CityJobsList initialJobs={jobs} />
    </div>
  );
}