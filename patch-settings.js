import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regex = /const \{ logoAssetId, \.\.\.settingsUpdates \} = updates;/;

const newBlock = `const { logoAssetId, ...settingsUpdates } = updates;
      
      // Phase D.1 Hardening: Deterministic Capability Enforcement
      if (settingsUpdates.enableProduction === true) {
        settingsUpdates.enableRecipes = true;
        settingsUpdates.enableInventory = true;
      }
      if (settingsUpdates.enableFoodCosting === true) {
        settingsUpdates.enableRecipes = true;
        settingsUpdates.enableInventory = true;
      }
      if (settingsUpdates.enableRecipes === true) {
        settingsUpdates.enableInventory = true;
      }
      
      if (settingsUpdates.enableInventory === false) {
        settingsUpdates.enableRecipes = false;
        settingsUpdates.enableProduction = false;
        settingsUpdates.enableFoodCosting = false;
      }
      if (settingsUpdates.enableRecipes === false) {
        settingsUpdates.enableProduction = false;
        settingsUpdates.enableFoodCosting = false;
      }`;

if (regex.test(code)) {
  code = code.replace(regex, newBlock);
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Patched capability enforcement!");
} else {
  console.log("Regex missed!");
}
