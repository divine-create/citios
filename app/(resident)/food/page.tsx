import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityFood from '@/components/cityos/CityFood';

export default async function FoodPage() {
  const config = await getVerticalsConfig();
  if (!config.food) {
    return <VerticalPausedNotice verticalName="Food" verticalId="food" />;
  }

  return <CityFood />;
}