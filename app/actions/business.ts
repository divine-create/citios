'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireMembership } from '@/lib/actions/tenant';

export async function getUnifiedBusinessAnalytics(organizationId: string) {
  await requireMembership(organizationId);

  // We need to fetch from RetailOrder, RestaurantOrder, Reservation, ServiceJob
  // Since we don't know the org type precisely without checking, we'll try to find all.
  
  const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
  if (!org) throw new Error('Org not found');

  let revenue = 0;
  let ordersCount = 0;
  let customersCount = 0;
  const recentOrders: any[] = [];
  const topProductsMap = new Map<string, { name: string; revenue: number; sold: number }>();

  if (org.type === 'RETAIL') {
    const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();
    ordersCount = orders.length;
    revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completed = orders.filter(o => o.status === 'CONFIRMED');
    
    // Add to top products
    // @ts-ignore
    const lines = await db.orm.public.RetailOrderItem.where({ orderId: { in: completed.map(o => o.id) } } as any).all();
    for (const l of lines) {
      if (!topProductsMap.has(l.productId)) {
        topProductsMap.set(l.productId, { name: 'Product ' + l.productId.substring(0, 4), revenue: 0, sold: 0 });
      }
      const p = topProductsMap.get(l.productId)!;
      p.sold += l.quantity;
      p.revenue += l.unitPrice * l.quantity;
    }

    recentOrders.push(...orders.slice(0, 10).map(o => ({
      ref: o.id.substring(0, 6).toUpperCase(),
      name: 'Customer', // Would need customerData fetch
      area: 'Local',
      amount: o.totalAmount,
      status: o.status,
      time: o.createdAt
    })));
  } else if (org.type === 'RESTAURANT') {
    const orders = await db.orm.public.RestaurantOrder.where({ organizationId }).all();
    ordersCount = orders.length;
    revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completed = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'DELIVERED');

    // Add to top products
    // @ts-ignore
    const lines = await db.orm.public.OrderItem.where({ orderId: { in: completed.map(o => o.id) } } as any).all();
    for (const l of lines) {
      if (!topProductsMap.has(l.menuItemId)) {
        topProductsMap.set(l.menuItemId, { name: 'Item ' + l.menuItemId.substring(0, 4), revenue: 0, sold: 0 });
      }
      const p = topProductsMap.get(l.menuItemId)!;
      p.sold += l.quantity;
      p.revenue += l.unitPrice * l.quantity;
    }

    recentOrders.push(...orders.slice(0, 10).map(o => ({
      ref: o.id.substring(0, 6).toUpperCase(),
      name: 'Customer',
      area: 'Local',
      amount: o.totalAmount,
      status: o.status,
      time: o.createdAt
    })));
  } else if (org.type === 'HOTEL') {
    const res = await db.orm.public.Reservation.where({ organizationId }).all();
    ordersCount = res.length;
    revenue = res.reduce((sum, r) => sum + r.totalAmount, 0);

    recentOrders.push(...res.slice(0, 10).map(o => ({
      ref: o.id.substring(0, 6).toUpperCase(),
      name: o.guestName,
      area: 'Reservation',
      amount: o.totalAmount,
      status: o.status,
      time: o.createdAt
    })));
  } else if (org.type === 'SCHOOL') {
    // Basic stats for school
    const students = await db.orm.public.StudentData.where({ organizationId }).all();
    ordersCount = students.length; // use it for students
  }

  // Sort top products
  const topProducts = Array.from(topProductsMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  recentOrders.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return {
    revenue,
    ordersCount,
    customersCount: ordersCount, // Approximate for now without deduping
    topProducts,
    recentOrders: recentOrders.slice(0, 5).map(o => ({
      ...o,
      time: new Date(o.time).toLocaleDateString()
    }))
  };
}



