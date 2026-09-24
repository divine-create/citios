import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// Find the modifier loop inside createPosOrder
const regex = /if\s*\(item\.modifierOptionIds\s*&&\s*item\.modifierOptionIds\.length\s*>\s*0\)\s*\{([\s\S]*?)for\s*\(const\s+optId\s+of\s+item\.modifierOptionIds\)\s*\{/;

const newBlock = `
        // Validate Modifiers
        if (settings?.enableModifiers) {
          const links = await db.orm.public.MenuItemModifierGroup.where({ menuItemId: menuItem.id }).all();
          const requiredGroups = new Set();
          for (const link of links) {
            const group = await db.orm.public.ModifierGroup.where({ id: link.modifierGroupId }).all().first();
            if (group && group.isActive && group.isRequired) {
              requiredGroups.add(group.id);
            }
          }

          const selectedOptionCounts = new Map<string, number>();

          if (item.modifierOptionIds && item.modifierOptionIds.length > 0) {
            const opts = await db.orm.public.ModifierOption.where({ id: { in: item.modifierOptionIds } }).all();
            
            for (const optId of item.modifierOptionIds) {
              const opt = opts.find((o: any) => o.id === optId);
              if (!opt || !opt.isActive) return { error: \`Invalid or inactive modifier selected.\` };
              
              const groupId = opt.modifierGroupId;
              selectedOptionCounts.set(groupId, (selectedOptionCounts.get(groupId) || 0) + 1);

              unitPrice += opt.priceDelta;
              modifiers.push({ optionId: opt.id, name: opt.name, priceDelta: opt.priceDelta });

              if (opt.inventoryItemId && opt.inventoryQuantity) {
                const inv = await db.orm.public.RestaurantInventoryItem.where({ id: opt.inventoryItemId }).all().first();
                if (inv) unitCost += inv.cost * opt.inventoryQuantity;
              }
            }
          }

          // Check min/max and required
          for (const link of links) {
            const group = await db.orm.public.ModifierGroup.where({ id: link.modifierGroupId }).all().first();
            if (!group || !group.isActive) continue;

            const count = selectedOptionCounts.get(group.id) || 0;
            if (group.isRequired && count === 0) return { error: \`Missing required modifier selection for \${group.name}.\` };
            if (group.minSelections > 0 && count < group.minSelections) return { error: \`Please select at least \${group.minSelections} for \${group.name}.\` };
            if (group.maxSelections && group.maxSelections > 0 && count > group.maxSelections) return { error: \`Too many selections for \${group.name} (max \${group.maxSelections}).\` };
            
            requiredGroups.delete(group.id);
          }

          if (requiredGroups.size > 0) return { error: \`Missing required modifier selection.\` };
        } else if (item.modifierOptionIds && item.modifierOptionIds.length > 0) {
           return { error: 'Modifiers are not enabled for this restaurant.' };
        }
`;

if (regex.test(code)) {
  const match = code.match(/if\s*\(item\.modifierOptionIds\s*&&\s*item\.modifierOptionIds\.length\s*>\s*0\)\s*\{([\s\S]*?)\s*\/\/\s*Modifier\s*Unit\s*Cost\s*if\s*\(opt\.inventoryItemId\s*&&\s*opt\.inventoryQuantity\)\s*\{\s*const\s+inv\s*=\s*await\s+db\.orm\.public\.RestaurantInventoryItem\.where\(\{ id: opt\.inventoryItemId \}\)\.all\(\)\.first\(\);\s*if\s*\(inv\)\s*\{\s*unitCost\s*\+=\s*inv\.cost\s*\*\s*opt\.inventoryQuantity;\s*\}\s*\}\s*\}\s*\}\s*\}/);
  if(match) {
    code = code.replace(match[0], newBlock);
    fs.writeFileSync('lib/actions/restaurantos.ts', code);
    console.log("Successfully added modifier validation!");
  } else {
     console.log("Second match failed!");
  }
} else {
  console.log("Regex did not match!");
}
