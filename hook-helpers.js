import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// Update createPosOrder to consume inventory if COUNTER style
const counterStyleUpdate = `await tx.orm.public.RestaurantSettings
          .where({ organizationId: input.organizationId })
          .update({ nextOrderNumber: orderNumber + 1 });
        
        if (created.status === 'COMPLETED') {
          await consumeInventoryForOrder(tx, created.id, input.organizationId, settings);
        }
        
        return created;`;

code = code.replace(/await tx\.orm\.public\.RestaurantSettings[\s\S]*?\.update\(\{ nextOrderNumber: orderNumber \+ 1 \}\);\s*return created;/, counterStyleUpdate);

// Replace consumption block in updateOrderStatus
const oldConsumptionBlock = /if \(status === 'COMPLETED' && !order\.inventoryConsumed\) \{[\s\S]*?await tx\.orm\.public\.RestaurantOrder\.where\(\{ id: orderId \}\)\.update\(\{ inventoryConsumed: true \}\);\s*\}/;
const newConsumptionBlock = `if (status === 'COMPLETED' && !order.inventoryConsumed) {
          const settings = await tx.orm.public.RestaurantSettings.where({ organizationId: order.organizationId }).all().first();
          await consumeInventoryForOrder(tx, orderId, order.organizationId, settings);
        }`;
code = code.replace(oldConsumptionBlock, newConsumptionBlock);

// Replace reversal block in updateOrderStatus
const oldReversalBlock = /if \(status === 'CANCELLED' && order\.inventoryConsumed\) \{[\s\S]*?await tx\.orm\.public\.RestaurantOrder\.where\(\{ id: orderId \}\)\.update\(\{ inventoryConsumed: false \}\);\s*\}/;
const newReversalBlock = `if (status === 'CANCELLED' && order.inventoryConsumed) {
          const settings = await tx.orm.public.RestaurantSettings.where({ organizationId: order.organizationId }).all().first();
          await reverseInventoryForOrder(tx, orderId, order.organizationId, settings);
        }`;
code = code.replace(oldReversalBlock, newReversalBlock);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
