import { notFound } from 'next/navigation';
import { getCurrentCity } from '@/lib/city';
import { getCityBookableServices, getCityServiceCategoryCounts } from '@/lib/actions/service';
import { getCategoryBySlug } from '@/lib/service-categories';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityServices from '@/components/cityos/CityServices';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categoryDef = getCategoryBySlug(category);
  if (!categoryDef) {
    return { title: 'Services | CityOS' };
  }
  return {
    title: `${categoryDef.label} Services | CityOS`,
    description: categoryDef.description,
  };
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const config = await getVerticalsConfig();
  if (!config.services) {
    return <VerticalPausedNotice verticalName="Services" verticalId="services" />;
  }

  const { category } = await params;
  const categoryDef = getCategoryBySlug(category);
  if (!categoryDef) {
    notFound();
  }

  const city = await getCurrentCity();

  // Scoped load: loads ONLY the bookable services strictly for this category!
  const [services, categoryCounts] = await Promise.all([
    getCityBookableServices(city?.slug, categoryDef.id),
    getCityServiceCategoryCounts(city?.slug),
  ]);

  return (
    <CityServices
      orgs={[]}
      services={services}
      initialCategory={categoryDef.id}
      initialCategoryCounts={categoryCounts}
      cityName={city?.name || 'City'}
    />
  );
}
