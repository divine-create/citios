import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const oldGetMenuItems = `// @ts-ignore
      const variants = itemIds.length > 0 ? await db.orm.public.MenuItemVariant.where({ organizationId, menuItemId: { in: itemIds } }).all() : [];

      return JSON.parse(JSON.stringify(
        items.map((i) => ({
          ...i,
          addons: addons.filter((a: any) => a.menuItemId === i.id),
          variants: variants.filter((v: any) => v.menuItemId === i.id),
        })),
      ));`;

const newGetMenuItems = `// @ts-ignore
      const variants = itemIds.length > 0 ? await db.orm.public.MenuItemVariant.where({ organizationId, menuItemId: { in: itemIds } }).all() : [];
      
      const modifierGroupsMap = new Map();
      if (itemIds.length > 0) {
        // @ts-ignore
        const links = await db.orm.public.MenuItemModifierGroup.where({ menuItemId: { in: itemIds } }).all();
        if (links.length > 0) {
          const groupIds = links.map((l: any) => l.modifierGroupId);
          // @ts-ignore
          const groups = await db.orm.public.ModifierGroup.where({ id: { in: groupIds } }).all();
          // @ts-ignore
          const options = await db.orm.public.ModifierOption.where({ modifierGroupId: { in: groupIds } }).all();
          
          for (const l of links) {
            const g = groups.find((g: any) => g.id === l.modifierGroupId);
            if (g) {
              if (!modifierGroupsMap.has(l.menuItemId)) modifierGroupsMap.set(l.menuItemId, []);
              modifierGroupsMap.get(l.menuItemId).push({
                ...g,
                options: options.filter((o: any) => o.modifierGroupId === g.id).sort((a: any, b: any) => a.displayOrder - b.displayOrder)
              });
            }
          }
        }
      }

      return JSON.parse(JSON.stringify(
        items.map((i) => ({
          ...i,
          addons: addons.filter((a: any) => a.menuItemId === i.id),
          variants: variants.filter((v: any) => v.menuItemId === i.id),
          modifierGroups: (modifierGroupsMap.get(i.id) || []).sort((a: any, b: any) => a.displayOrder - b.displayOrder)
        })),
      ));`;

code = code.replace(oldGetMenuItems, newGetMenuItems);
fs.writeFileSync('lib/actions/restaurantos.ts', code);
