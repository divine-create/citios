import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regex = /for\s*\(const\s+line\s+of\s+lineItems\)\s*\{\s*await\s+tx\.orm\.public\.OrderItem\.create\(\{\s*orderId:\s*created\.id,\s*menuItemId:\s*line\.menuItemId,\s*quantity:\s*line\.quantity,\s*unitPrice:\s*line\.unitPrice,\s*notes:\s*line\.notes,?\s*\}\);\s*\}/;

const newBlock = `for (const line of lineItems) {
          const oi = await tx.orm.public.OrderItem.create({
            orderId: created.id,
            menuItemId: line.menuItemId,
            menuItemName: line.menuItemName,
            variantId: line.variantId,
            variantName: line.variantName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: line.unitCost || 0,
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

if (regex.test(code)) {
  code = code.replace(regex, newBlock);
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Successfully replaced order item insertion!");
} else {
  console.log("Regex did not match!");
}
