import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const oldPush = `lineItems.push({ 
            menuItemId: menuItem.id, 
            menuItemName: menuItem.name,
            variantId: item.variantId ?? null,
            variantName,
            quantity, 
            unitPrice, 
            notes: item.notes ?? null,
            modifiers 
          });`;

const newPush = `lineItems.push({ 
            menuItemId: menuItem.id, 
            menuItemName: menuItem.name,
            variantId: item.variantId ?? null,
            variantName,
            quantity, 
            unitPrice,
            unitCost, 
            notes: item.notes ?? null,
            modifiers 
          });`;

code = code.replace(oldPush, newPush);
fs.writeFileSync('lib/actions/restaurantos.ts', code);
