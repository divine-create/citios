import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityMarket from '@/components/cityos/CityMarket';

export default async function MarketPage() {
  const config = await getVerticalsConfig();
  if (!config.shops) {
    return <VerticalPausedNotice verticalName="CityMart & Retail" verticalId="shops" />;
  }

  return <CityMarket />;
}