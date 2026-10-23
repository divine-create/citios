'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  CalendarDays, 
  Clock, 
  MenuSquare, 
  Layers, 
  SlidersHorizontal, 
  PackageSearch, 
  BookOpen, 
  ChefHat, 
  Trash2, 
  LineChart, 
  CreditCard, 
  Percent, 
  Users, 
  Settings,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';

export default function RestaurantManagementSidebar({ slug, settings, orgName }: { slug: string; settings: any; orgName: string }) {
  const pathname = usePathname();

  const navGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { label: 'POS Terminal', href: `/workspaces/restaurantos/${slug}/pos`, icon: <ShoppingBag size={18} /> },
        { label: 'Kitchen Display', href: `/workspaces/restaurantos/${slug}/kds`, icon: <ChefHat size={18} /> },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { label: 'Overview', href: `/workspaces/restaurantos/${slug}/management/overview`, icon: <LayoutDashboard size={18} /> },
        { label: 'Orders', href: `/workspaces/restaurantos/${slug}/management/orders`, icon: <ShoppingBag size={18} /> },
        { label: 'Reservations', href: `/workspaces/restaurantos/${slug}/management/reservations`, icon: <CalendarDays size={18} /> },
        { label: 'Shifts', href: `/workspaces/restaurantos/${slug}/management/shifts`, icon: <Clock size={18} /> },
      ]
    },
    {
      title: 'MENU',
      items: [
        { label: 'Menu Items', href: `/workspaces/restaurantos/${slug}/management/menu`, icon: <MenuSquare size={18} /> },
        ...(settings?.enableVariants !== false ? [{ label: 'Variants', href: `/workspaces/restaurantos/${slug}/management/variants`, icon: <Layers size={18} /> }] : []),
        ...(settings?.enableModifiers !== false ? [{ label: 'Modifiers', href: `/workspaces/restaurantos/${slug}/management/modifiers`, icon: <SlidersHorizontal size={18} /> }] : []),
      ]
    },
    ...(settings?.enableInventory !== false ? [{
      title: 'INVENTORY',
      items: [
        { label: 'Stock Levels', href: `/workspaces/restaurantos/${slug}/management/inventory`, icon: <PackageSearch size={18} /> },
        { label: 'Units of Measure', href: `/workspaces/restaurantos/${slug}/management/units`, icon: <Scale size={18} /> },
        ...(settings?.enableRecipes !== false ? [{ label: 'Recipes', href: `/workspaces/restaurantos/${slug}/management/recipes`, icon: <BookOpen size={18} /> }] : []),
        ...(settings?.enableProduction !== false ? [{ label: 'Production', href: `/workspaces/restaurantos/${slug}/management/production`, icon: <ChefHat size={18} /> }] : []),
      ]
    }] : []),
    {
      title: 'FINANCIALS',
      items: [
        { label: 'Revenue', href: `/workspaces/restaurantos/${slug}/management/revenue`, icon: <LineChart size={18} /> },
        { label: 'Expenses', href: `/workspaces/restaurantos/${slug}/management/expenses`, icon: <CreditCard size={18} /> },
        ...(settings?.enableFoodCosting !== false ? [{ label: 'Food Cost', href: `/workspaces/restaurantos/${slug}/management/costing`, icon: <Percent size={18} /> }] : []),
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { label: 'Team Roles', href: `/workspaces/restaurantos/${slug}/management/team`, icon: <Users size={18} /> },
        { label: 'Tables', href: `/workspaces/restaurantos/${slug}/management/tables`, icon: <LayoutDashboard size={18} /> },
        { label: 'Settings', href: `/workspaces/restaurantos/${slug}/management/capabilities`, icon: <Settings size={18} /> },
      ]
    },
    {
      title: 'SUPPORT',
      items: [
        { label: 'Support & Disputes', href: `/workspaces/restaurantos/${slug}/management/support`, icon: <Layers size={18} /> },
      ]
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col overflow-y-auto ">
      <div className="p-6">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">{orgName}</h2>
        <Badge variant="teal" className="mt-2">RestaurantOS</Badge>
      </div>

      <div className="flex-1 px-4 pb-6 space-y-6">
        {navGroups.map((group, i) => (
          <div key={i}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">{group.title}</h3>
            <div className="space-y-1">
              {group.items.map((item, j) => {
                const active = pathname === item.href || (Boolean(pathname?.startsWith(item.href)) && item.href !== `/workspaces/restaurantos/${slug}/management/overview`);

                return (
                  <Link
                    key={j}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-colors",
                      active 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <span className={cn(active ? "text-emerald-600" : "text-slate-400")}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
