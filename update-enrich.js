import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const oldEnrich = `items: items.map((i: any) => ({
          ...i,
          itemName: menuItems.find((m) => m.id === i.menuItemId)?.name ?? 'Unknown',
            kitchenStation: menuItems.find((m) => m.id === i.menuItemId)?.kitchenStation ?? 'Main Kitchen',
            kitchenStatus: i.kitchenStatus,
        })),`;

const newEnrich = `items: await Promise.all(items.map(async (i: any) => {
          const modifiers = await db.orm.public.OrderItemModifier.where({ orderItemId: i.id }).all();
          return {
            ...i,
            itemName: i.menuItemName || menuItems.find((m: any) => m.id === i.menuItemId)?.name || 'Unknown',
            kitchenStation: menuItems.find((m: any) => m.id === i.menuItemId)?.kitchenStation ?? 'Main Kitchen',
            kitchenStatus: i.kitchenStatus,
            modifiers
          };
        })),`;

code = code.replace(oldEnrich, newEnrich);
fs.writeFileSync('lib/actions/restaurantos.ts', code);
