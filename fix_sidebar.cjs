const fs = require('fs');
let content = fs.readFileSync('components/restaurantos/management/RestaurantManagementSidebar.tsx', 'utf8');

// replace settings checks with fallback to true if undefined
content = content.replace(/settings\?\.enableVariants/g, 'settings?.enableVariants !== false');
content = content.replace(/settings\?\.enableModifiers/g, 'settings?.enableModifiers !== false');
content = content.replace(/settings\?\.enableInventory/g, 'settings?.enableInventory !== false');
content = content.replace(/settings\?\.enableRecipes/g, 'settings?.enableRecipes !== false');
content = content.replace(/settings\?\.enableProduction/g, 'settings?.enableProduction !== false');
content = content.replace(/settings\?\.enableFoodCosting/g, 'settings?.enableFoodCosting !== false');

fs.writeFileSync('components/restaurantos/management/RestaurantManagementSidebar.tsx', content);
