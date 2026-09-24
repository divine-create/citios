import fs from 'fs';

let code = fs.readFileSync('components/cityos/workspaces/RestaurantOSWorkspace.tsx', 'utf8');

// 1. Pass inventory to TabProductionRuns
const renderOld = `{activeMenu === "Kitchen Prep & Batches" && <TabProductionRuns runs={productionRuns} recipes={recipes} slug={slug} onDone={loadData} org={org} />}`;
const renderNew = `{activeMenu === "Kitchen Prep & Batches" && <TabProductionRuns runs={productionRuns} recipes={recipes} inventory={inventory} slug={slug} onDone={loadData} org={org} />}`;
code = code.replace(renderOld, renderNew);

// 2. Add inventory to TabProductionRuns signature
const sigOld = `function TabProductionRuns({ runs, recipes, slug, onDone }: any) {`;
const sigNew = `function TabProductionRuns({ runs, recipes, inventory, slug, onDone }: any) {`;
code = code.replace(sigOld, sigNew);

fs.writeFileSync('components/cityos/workspaces/RestaurantOSWorkspace.tsx', code);
