import { notFound } from 'next/navigation';
import { getCityFoodRestaurant } from '@/app/actions/food';
import { getCurrentCity } from '@/lib/city';
import RestaurantStorefrontView from '@/components/cityos/RestaurantStorefrontView';

interface Props {
  params: Promise<{ orgId: string }>;
}

export default async function CityFoodRestaurantPage({ params }: Props) {
  const { orgId } = await params;
  const data = await getCityFoodRestaurant(orgId);
  const city = await getCurrentCity();
  const cityName = city?.name ?? 'Calabar';

  if (!data) {
    notFound();
  }

  const { location, menuItems, ...restaurant } = data;

  return (
    <RestaurantStorefrontView
      restaurant={restaurant}
      location={location}
      menuItems={menuItems}
      cityName={cityName}
    />
  );
}
