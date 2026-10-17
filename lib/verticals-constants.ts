export type VerticalId = 'jobs' | 'houses' | 'shops' | 'food' | 'services' | 'events';

export interface PlatformVerticalsConfig {
  jobs: boolean;
  houses: boolean;
  shops: boolean;
  food: boolean;
  services: boolean;
  events: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface VerticalDefinition {
  id: VerticalId;
  name: string;
  description: string;
  path: string;
  iconKey: string;
  badge: string;
}

export const VERTICAL_DEFINITIONS: Record<VerticalId, VerticalDefinition> = {
  jobs: {
    id: 'jobs',
    name: 'CityJobs',
    description: 'Local job vacancies, talent hiring, gig listings, and applications.',
    path: '/jobs',
    iconKey: 'jobs',
    badge: 'Careers',
  },
  houses: {
    id: 'houses',
    name: 'CityHomes & Stays',
    description: 'Apartments, short lets, hotel rooms, and house rentals.',
    path: '/stay',
    iconKey: 'stay',
    badge: 'Real Estate & Hospitality',
  },
  shops: {
    id: 'shops',
    name: 'CityMart & Retail',
    description: 'Hyperlocal shopping, grocery stores, pharmacies, and merchant markets.',
    path: '/market',
    iconKey: 'shop',
    badge: 'Retail',
  },
  food: {
    id: 'food',
    name: 'CityFood & Restaurants',
    description: 'Local kitchens, restaurants, food menus, and delivery dispatch.',
    path: '/food',
    iconKey: 'all',
    badge: 'Dining & Delivery',
  },
  services: {
    id: 'services',
    name: 'CityServices & Trades',
    description: 'Home repairs, AC servicing, electrical, plumbing, auto, and verified pros.',
    path: '/services',
    iconKey: 'services',
    badge: 'Home Trades & Pro Services',
  },
  events: {
    id: 'events',
    name: 'CityEvents & Culture',
    description: 'Conferences, festivals, parties, ticket booking, and nightlife.',
    path: '/events',
    iconKey: 'events',
    badge: 'Events & Tickets',
  },
};

export const DEFAULT_VERTICALS_CONFIG: PlatformVerticalsConfig = {
  jobs: true,
  houses: true,
  shops: true,
  food: true,
  services: true,
  events: true,
};
