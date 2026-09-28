import { searchCityExplore } from '@/app/actions/explore';
import { getCityMartProducts, getCityMartStores } from '@/app/actions/commerce';
import { getCityFood } from '@/app/actions/food';
import { fetchMyOrders } from '@/app/actions/orders';
import { db } from '@/src/prisma/db';
import type { Session } from 'next-auth';

export async function executeTool(name: string, args: any, session: Session) {
  try {
    switch (name) {
      case 'search_city': {
        const query = typeof args.query === 'string' ? args.query : '';
        const cat = typeof args.category === 'string' ? args.category : 'All';
        const res = await searchCityExplore(undefined, query, cat);
        return {
          organizations: res.organizations.slice(0, 5).map((o: any) => ({
            name: o.name,
            category: o.category,
            area: o.area,
            description: o.description
          })),
          products: res.products.slice(0, 5).map((p: any) => ({
            name: p.name,
            price: p.price,
            business: p.bizName
          }))
        };
      }

      case 'search_products': {
        const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
        const cat = typeof args.category === 'string' ? args.category : 'All';
        const products = await getCityMartProducts(undefined, cat);
        
        const filtered = query ? products.filter((p: any) => 
          p.name.toLowerCase().includes(query) || 
          (p.description || '').toLowerCase().includes(query)
        ) : products;

        return filtered.slice(0, 5).map((p: any) => ({
          name: p.name,
          price: p.price,
          storeName: p.storeName,
          category: p.globalCategory
        }));
      }

      case 'search_businesses': {
        const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
        const stores = await getCityMartStores();
        const filtered = query ? stores.filter((s: any) => 
          s.name.toLowerCase().includes(query) || 
          (s.description || '').toLowerCase().includes(query)
        ) : stores;

        return filtered.slice(0, 5).map((s: any) => ({
          name: s.name,
          description: s.description,
          type: s.type
        }));
      }

      case 'search_restaurants': {
        const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
        const res = await getCityFood();
        
        const filtered = query ? res.restaurants.filter((r: any) => 
          r.name.toLowerCase().includes(query) || 
          (r.description || '').toLowerCase().includes(query)
        ) : res.restaurants;

        return filtered.slice(0, 5).map((r: any) => ({
          name: r.name,
          description: r.description,
          deliveryEta: r.deliveryEta,
          isOpen: r.isOpen
        }));
      }

      case 'get_order_status': {
        const orders = await fetchMyOrders(); // Assumes fetchMyOrders uses its own getServerSession, which it does.
        
        if (args.order_id && typeof args.order_id === 'string') {
          const matchRetail = orders.retail?.find((o: any) => o.id === args.order_id || (o.ref && o.ref === args.order_id));
          const matchRestaurant = orders.restaurant?.find((o: any) => o.id === args.order_id || (o.ref && o.ref === args.order_id));
          const order = matchRetail || matchRestaurant;
          
          if (!order) return { error: 'NOT_FOUND', message: 'Order not found or does not belong to you.' };
          
          return {
            reference: order.ref || order.id.split('-')[0].toUpperCase(),
            status: order.status,
            totalAmount: order.totalAmount || order.total,
            merchant: order.org?.name || order.merchant || 'Unknown'
          };
        }

        const recentRetail = (orders.retail || []).slice(0, 2);
        const recentRestaurant = (orders.restaurant || []).slice(0, 2);
        const combined = [...recentRetail, ...recentRestaurant].map((o: any) => ({
          reference: o.ref || o.id.split('-')[0].toUpperCase(),
          status: o.status,
          totalAmount: o.totalAmount || o.total,
          merchant: o.org?.name || o.merchant || 'Unknown'
        }));

        if (combined.length === 0) {
          return { message: 'You have no recent orders.' };
        }
        return combined.slice(0, 3);
      }

      case 'get_delivery_status': {
        const orders = await fetchMyOrders();
        
        // Find deliveries in restaurant orders
        let deliveries = (orders.restaurant || []).filter((o: any) => o.delivery);
        if (args.order_id && typeof args.order_id === 'string') {
          deliveries = deliveries.filter((o: any) => o.id === args.order_id || (o.ref && o.ref === args.order_id));
          if (deliveries.length === 0) return { error: 'NOT_FOUND', message: 'No delivery found for this order.' };
        }

        if (deliveries.length === 0) return { message: 'You have no active deliveries.' };

        return deliveries.slice(0, 3).map((o: any) => ({
          reference: o.ref || o.id.split('-')[0].toUpperCase(),
          status: o.delivery.status,
          deliveryEta: 'ETA unavailable' // Real ETA logic is missing in CityOS currently
        }));
      }

      case 'get_profile': {
        const person = await db.orm.public.Person.where({ id: session.user.personId }).all().first();
        const profile = await db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first();

        if (!person) return { error: 'NOT_FOUND', message: 'Profile not found.' };

        return {
          firstName: person.firstName,
          lastName: person.lastName,
          interests: profile?.interests ? JSON.parse(profile.interests) : []
        };
      }

      case 'get_cart': {
        const { getVoiceCart } = await import('@/lib/voice/cart');
        const personId = session.user.personId;
        if (!personId) throw new Error('Person ID missing from session');
        const { cart, subtotal } = await getVoiceCart(personId);
        return {
          itemCount: cart.items.length,
          subtotal,
          items: cart.items.map((i: any) => ({
            productId: i.productId,
            name: i.product?.name || 'Unknown',
            price: i.product?.price || 0,
            quantity: i.quantity,
          })),
          pendingCheckout: !!cart.checkout
        };
      }

      case 'add_to_cart': {
        const { addVoiceCartItem } = await import('@/lib/voice/cart');
        const qty = args.quantity ? parseInt(args.quantity) : 1;
        const personId = session.user.personId;
        if (!personId) throw new Error('Person ID missing from session');
        const res = await addVoiceCartItem(personId, args.product_id, qty);
        return { success: true, message: 'Item added.', newSubtotal: res.subtotal };
      }

      case 'update_cart_quantity': {
        const { updateVoiceCartQuantity } = await import('@/lib/voice/cart');
        const personId = session.user.personId;
        if (!personId) throw new Error('Person ID missing from session');
        const res = await updateVoiceCartQuantity(personId, args.product_id, parseInt(args.quantity));
        return { success: true, message: 'Quantity updated.', newSubtotal: res.subtotal };
      }

      case 'remove_from_cart': {
        const { removeVoiceCartItem } = await import('@/lib/voice/cart');
        const personId = session.user.personId;
        if (!personId) throw new Error('Person ID missing from session');
        const res = await removeVoiceCartItem(personId, args.product_id);
        return { success: true, message: 'Item removed.', newSubtotal: res.subtotal };
      }

      case 'prepare_checkout': {
        const { prepareVoiceCheckout } = await import('@/lib/voice/cart');
        const personId = session.user.personId;
        if (!personId) throw new Error('Person ID missing from session');
        const res = await prepareVoiceCheckout(personId);
        return { 
          success: true, 
          checkoutId: res.checkoutId, 
          totalAmount: res.totalAmount,
          instruction: 'Ask the user to explicitly confirm they want to place this order.' 
        };
      }

      case 'confirm_checkout': {
        const { confirmVoiceCheckout } = await import('@/lib/voice/cart');
        const personId = session.user.personId;
        if (!personId) throw new Error('Person ID missing from session');
        if (!args.checkout_id) return { error: 'MISSING_CHECKOUT_ID' };
        
        const res = await confirmVoiceCheckout(personId, args.checkout_id);
        return { success: true, message: 'Order placed successfully.', orderData: res };
      }

      default:
        return { error: 'INVALID_TOOL', message: `Tool ${name} is not registered.` };
    }
  } catch (err: any) {
    console.error(`Tool execution error [${name}]:`, err);
    return { error: 'INTERNAL_ERROR', message: err.message || 'An internal error occurred while executing this tool.' };
  }
}
