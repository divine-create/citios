import { getCityMartProducts } from '@/app/actions/commerce';
import { getCityFood } from '@/app/actions/food';
import { getCurrentCity } from '@/lib/city';

export async function GET() {
  try {
    const city = await getCurrentCity();
    const products = await getCityMartProducts(undefined, 'All');
    const food = await getCityFood();
    return new Response(JSON.stringify({ city, productsCount: products.length, foodResCount: food.restaurants.length, foodItemsCount: food.menuItems.length }), { status: 200 });
  } catch(e: any) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500 });
  }
}
