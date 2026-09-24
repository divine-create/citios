import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regex = /if \(item\.variantId\) \{[\s\S]*?if \(variant\) \{[\s\S]*?unitPrice = variant\.price;[\s\S]*?variantName = variant\.name;[\s\S]*?\}[\s\S]*?\}/;

const replacement = `if (item.variantId) {
          if (!settings?.enableVariants) return { error: 'Variants are disabled for this organization.' };
          const variant = await db.orm.public.MenuItemVariant.where({ id: item.variantId, menuItemId: menuItem.id }).all().first();
          if (!variant || !variant.isAvailable) return { error: 'Invalid or inactive variant selected.' };
          
          unitPrice = variant.price;
          variantName = variant.name;
        }`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Patched variant validation!");
} else {
  console.log("Regex missed!");
}
