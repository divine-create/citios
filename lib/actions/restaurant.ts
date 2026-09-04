
'use server'

import { db } from '@/src/prisma/db'

export async function getRestaurantAdminData() {
  try {
    const restaurant = await db.orm.public.Organization.where({ type: 'RESTAURANT' }).all().first();

    if (!restaurant) return null;

    const menuItems = await db.orm.public.MenuItem.where({ organizationId: restaurant.id }).all();
    
    // Using simple query since include is not easily typed for now
    const orders = await db.orm.public.RestaurantOrder.where({ organizationId: restaurant.id }).all();
    const orderItems = await db.orm.public.OrderItem.all();
    
    // Stitch order items to orders
    const ordersWithItems = orders.map(order => {
        return {
            ...order,
            items: orderItems.filter(item => item.orderId === order.id).map(item => ({
                ...item,
                menuItem: menuItems.find(m => m.id === item.menuItemId)
            }))
        };
    });

    return JSON.parse(JSON.stringify({
      restaurant,
      menuItems,
      orders: ordersWithItems
    }));
  } catch (error) {
    console.error('Error fetching restaurant data:', error);
    return null;
  }
}

