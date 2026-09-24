import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const signatureOld = `items: { menuItemId: string; quantity: number; notes?: string }[];`;
const signatureNew = `items: { menuItemId: string; quantity: number; notes?: string; variantId?: string; modifierOptionIds?: string[] }[];`;
code = code.replace(signatureOld, signatureNew);

const loopOld = /const lineItems: \{[\s\S]*?subtotal \+= unitPrice \* quantity;\s*\}/;

const loopNew = `const lineItems: any[] = [];
      let subtotal = 0;
      for (const item of input.items) {
        const menuItem = itemById.get(item.menuItemId);
        if (!menuItem) return { error: "An item on the order is not on this kitchen's menu." };
        if (menuItem.isAvailable === false) return { error: \`86'd item: \${menuItem.name} is unavailable.\` };
        const quantity = item.quantity;
        if (!(quantity > 0)) return { error: 'Item quantities must be greater than zero.' };
        
        let unitPrice = menuItem.price;
        let variantName: string | null = null;
        if (item.variantId) {
          const variant = await db.orm.public.MenuItemVariant.where({ id: item.variantId, menuItemId: menuItem.id }).all().first();
          if (variant) {
            unitPrice = variant.price;
            variantName = variant.name;
          }
        }

        const modifiers: any[] = [];
        if (item.modifierOptionIds && item.modifierOptionIds.length > 0) {
          const opts = await db.orm.public.ModifierOption.where({ id: { in: item.modifierOptionIds } }).all();
          for (const optId of item.modifierOptionIds) {
            const opt = opts.find((o: any) => o.id === optId);
            if (opt) {
              unitPrice += opt.priceDelta;
              modifiers.push({ optionId: opt.id, name: opt.name, priceDelta: opt.priceDelta });
            }
          }
        }

        lineItems.push({ 
          menuItemId: menuItem.id, 
          menuItemName: menuItem.name,
          variantId: item.variantId ?? null,
          variantName,
          quantity, 
          unitPrice, 
          notes: item.notes ?? null,
          modifiers 
        });
        subtotal += unitPrice * quantity;
      }`;
code = code.replace(loopOld, loopNew);

const insertOld = /\/\/ Insert line items\s*for \(const line of lineItems\) \{\s*await tx\.orm\.public\.OrderItem\.create\(\{\s*orderId: created\.id,\s*menuItemId: line\.menuItemId,\s*quantity: line\.quantity,\s*unitPrice: line\.unitPrice,\s*notes: line\.notes\s*\}\);\s*\}/;

const insertNew = `// Insert line items
        for (const line of lineItems) {
          const oi = await tx.orm.public.OrderItem.create({
            orderId: created.id,
            menuItemId: line.menuItemId,
            menuItemName: line.menuItemName,
            variantId: line.variantId,
            variantName: line.variantName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            notes: line.notes
          });
          
          if (line.modifiers && line.modifiers.length > 0) {
            for (const mod of line.modifiers) {
              await tx.orm.public.OrderItemModifier.create({
                orderItemId: oi.id,
                modifierOptionId: mod.optionId,
                name: mod.name,
                priceDelta: mod.priceDelta
              });
            }
          }
        }`;
code = code.replace(insertOld, insertNew);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
