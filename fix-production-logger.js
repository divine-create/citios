import fs from 'fs';

let wsCode = fs.readFileSync('components/cityos/workspaces/RestaurantOSWorkspace.tsx', 'utf8');
wsCode = wsCode.replace(
  /<ProductionRunLogger organizationId=\{slug\} recipes=\{recipes\}/g,
  "<ProductionRunLogger organizationId={slug} recipes={recipes} inventory={inventory}"
);
fs.writeFileSync('components/cityos/workspaces/RestaurantOSWorkspace.tsx', wsCode);

let prCode = fs.readFileSync('components/restaurantos/forms/ProductionRunLogger.tsx', 'utf8');
prCode = prCode.replace(
  "export function ProductionRunLogger({ recipes, organizationId, onDone }: any) {",
  "export function ProductionRunLogger({ recipes, inventory, organizationId, onDone }: any) {"
);
prCode = prCode.replace(
  /\{ing\.quantity \* batchMultiplier\}x of Item \{ing\.itemId\}/g,
  `{ing.quantity * batchMultiplier}x of {inventory?.find((i: any) => i.id === ing.itemId)?.name || 'Item ' + ing.itemId}`
);
fs.writeFileSync('components/restaurantos/forms/ProductionRunLogger.tsx', prCode);
