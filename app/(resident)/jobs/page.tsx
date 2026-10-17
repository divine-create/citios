import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityJobsList from '@/components/cityos/CityJobsList';

export default async function CityJobsPage() {
  const config = await getVerticalsConfig();
  if (!config.jobs) {
    return <VerticalPausedNotice verticalName="CityJobs" verticalId="jobs" />;
  }

  return (
    <div className="py-6">
      <CityJobsList />
    </div>
  );
}