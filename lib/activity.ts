import type { LucideIcon } from 'lucide-react';
import {
  ShoppingBag,
  Banknote,
  Truck,
  Building2,
  Sparkles,
  ShieldCheck,
  Car,
  Calendar,
  Briefcase,
  Wrench,
} from 'lucide-react';

export type ActivityKind =
  | 'order'
  | 'payment'
  | 'delivery'
  | 'rent'
  | 'promo'
  | 'security'
  | 'ride'
  | 'event'
  | 'job'
  | 'service';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  body: string;
  time: string;
  href?: string;
}

export const ACTIVITY_KIND_META: Record<ActivityKind, { label: string; icon: LucideIcon }> = {
  order: { label: 'Order', icon: ShoppingBag },
  payment: { label: 'Payment', icon: Banknote },
  delivery: { label: 'Delivery', icon: Truck },
  rent: { label: 'CityHouse', icon: Building2 },
  promo: { label: 'Promo', icon: Sparkles },
  security: { label: 'Security', icon: ShieldCheck },
  ride: { label: 'Ride', icon: Car },
  event: { label: 'Event', icon: Calendar },
  job: { label: 'CityJobs', icon: Briefcase },
  service: { label: 'Service', icon: Wrench },
};
