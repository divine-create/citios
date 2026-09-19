// Verifies the RestaurantOS tables are live in the database. Read-only.
import { db } from '../src/prisma/db.js';

async function verify() {
  const settings = await db.orm.public.RestaurantSettings.all();
  const tables = await db.orm.public.RestaurantTable.all();
  const reservations = await db.orm.public.RestaurantReservation.all();
  const inventory = await db.orm.public.RestaurantInventoryItem.all();
  const expenses = await db.orm.public.RestaurantExpense.all();
  const addons = await db.orm.public.MenuItemAddon.all();
  const variants = await db.orm.public.MenuItemVariant.all();
  const combos = await db.orm.public.MenuItemCombo.all();
  const orders = await db.orm.public.RestaurantOrder.all();

  console.log(`RestaurantOS tables live:`);
  console.log(`  RestaurantSettings: ${settings.length}`);
  console.log(`  RestaurantTable: ${tables.length}`);
  console.log(`  RestaurantReservation: ${reservations.length}`);
  console.log(`  RestaurantInventoryItem: ${inventory.length}`);
  console.log(`  RestaurantExpense: ${expenses.length}`);
  console.log(`  MenuItemAddon: ${addons.length}`);
  console.log(`  MenuItemVariant: ${variants.length}`);
  console.log(`  MenuItemCombo: ${combos.length}`);
  console.log(`  RestaurantOrder (existing): ${orders.length}`);

  // Sanity: menu items exist to attach addons/variants to (Naija Kitchen + Mama's Kitchen)
  const menuItems = await db.orm.public.MenuItem.all();
  console.log(`  MenuItem (existing): ${menuItems.length}`);

  console.log('RESTAURANTOS VERIFY DONE');
  process.exit(0);
}

verify().catch((e) => { console.error(e); process.exit(1); });