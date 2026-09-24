import fs from 'fs';

let code = fs.readFileSync('components/cityos/workspaces/RestaurantOSWorkspace.tsx', 'utf8');

code = code.replace(
  /<RecipeBuilder organizationId=\{slug\} inventory=\{rawMaterials\} onDone=\{([\s\S]*?)\} \/>/g,
  "<RecipeBuilder organizationId={slug} inventory={rawMaterials} onComplete={$1} />"
);

fs.writeFileSync('components/cityos/workspaces/RestaurantOSWorkspace.tsx', code);
