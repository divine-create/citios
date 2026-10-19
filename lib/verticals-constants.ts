export type VerticalId = 'jobs' | 'houses' | 'shops' | 'food' | 'services' | 'events' | 'citypay';

export interface PlatformVerticalsConfig {
  jobs: boolean;
  houses: boolean;
  shops: boolean;
  food: boolean;
  services: boolean;
  events: boolean;
  citypay: boolean;
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
    name: 'Jobs',
    description: 'Local job vacancies, talent hiring, gig listings, and applications.',
    path: '/jobs',
    iconKey: 'jobs',
    badge: 'Careers',
  },
  houses: {
    id: 'houses',
    name: 'Stay',
    description: 'Apartments, short lets, hotel rooms, and house rentals.',
    path: '/stay',
    iconKey: 'stay',
    badge: 'Stays & Living',
  },
  shops: {
    id: 'shops',
    name: 'Shop',
    description: 'Hyperlocal shopping, grocery stores, pharmacies, and merchant markets.',
    path: '/market',
    iconKey: 'shop',
    badge: 'Retail & Markets',
  },
  food: {
    id: 'food',
    name: 'Food',
    description: 'Local kitchens, restaurants, food menus, and delivery dispatch.',
    path: '/food',
    iconKey: 'all',
    badge: 'Dining & Delivery',
  },
  services: {
    id: 'services',
    name: 'Services',
    description: 'Home repairs, AC servicing, electrical, plumbing, auto, and verified pros.',
    path: '/services',
    iconKey: 'services',
    badge: 'Trades & Pros',
  },
  events: {
    id: 'events',
    name: 'Events',
    description: 'Conferences, festivals, parties, ticket booking, and nightlife.',
    path: '/events',
    iconKey: 'events',
    badge: 'Events & Tickets',
  },
  citypay: {
    id: 'citypay',
    name: 'CityPay',
    description: 'Resident digital wallet, ledger balances, top-ups, and instant CityPay payments.',
    path: '/wallet',
    iconKey: 'citypay',
    badge: 'Wallet & Payments',
  },
};

export const DEFAULT_VERTICALS_CONFIG: PlatformVerticalsConfig = {
  jobs: true,
  houses: true,
  shops: true,
  food: true,
  services: true,
  events: true,
  citypay: false,
};
