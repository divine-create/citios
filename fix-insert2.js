import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const oldBlock = `for (const line of lineItems) {
          await tx.orm.public.OrderItem.create({
            orderId: created.id,
            menuItemId: line.menuItemId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            notes: line.notes,
          });
        }`;

const newBlock = `for (const line of lineItems) {
          const oi = await tx.orm.public.OrderItem.create({
            orderId: created.id,
            menuItemId: line.menuItemId,
            menuItemName: line.menuItemName,
            variantId: line.variantId,
            variantName: line.variantName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            notes: line.notes,
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

code = code.replace(oldBlock, newBlock);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
