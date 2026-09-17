import type { FeedPost } from '@/lib/demo/cityos';

export type DemoAccountKind = 'resident' | 'org';

export interface DemoAccount {
  id: string;
  kind: DemoAccountKind;
  name: string;
  initials: string;
  emoji: string;
  sub: string;
  area?: string;
  tagline?: string;
  memberSince?: string;
  walletId?: string;
  referralCode?: string;
  stats?: { orders: number; rides: number; payments: number; deliveries: number };
  orgId?: string;
  experienceId?: string;
  href?: string;
}

export interface AppOrder {
  id: string;
  ref: string;
  orgId: string;
  merchant: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: 'paid' | 'packing' | 'enroute';
  method: string;
  time: string;
  ts: number;
}

export interface ServiceRequest {
  id: string;
  orgId?: string;
  taskId: string;
  taskName: string;
  area: string;
  amount: number;
  pro: string;
  status: 'new' | 'quoted' | 'booked';
  time: string;
  ts: number;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  title: string;
  host: string;
  orgId?: string;
  ref: string;
  amount: number;
  time: string;
  ts: number;
}

export interface AppReview {
  id: string;
  orgId: string;
  author: string;
  rating: number;
  text: string;
  time: string;
  ts: number;
}

export type SaveKind = 'biz' | 'product' | 'job' | 'event' | 'place';

export interface SavedItem {
  kind: SaveKind;
  id: string;
}

export interface DemoState {
  version: 1;
  activeAccountId: string;
  follows: string[];
  likedPosts: string[];
  saved: SavedItem[];
  orders: AppOrder[];
  serviceRequests: ServiceRequest[];
  jobApps: string[];
  eventRegs: EventRegistration[];
  reviews: AppReview[];
  createdPosts: FeedPost[];
}