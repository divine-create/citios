import fs from 'fs';

// 1. Fix CostingDashboard.tsx
let costing = fs.readFileSync('components/restaurantos/management/CostingDashboard.tsx', 'utf8');
costing = costing.replace(/import \{ formatNaira \} from '@\/lib\/utils';/, "import { fmt } from '@/lib/utils';");
costing = costing.replace(/formatNaira/g, "fmt");
fs.writeFileSync('components/restaurantos/management/CostingDashboard.tsx', costing);

// 2. Fix MenuManager.tsx
let menu = fs.readFileSync('components/restaurantos/management/MenuManager.tsx', 'utf8');
menu = menu.replace(/import \{ formatNaira \} from '@\/lib\/utils';/, "import { fmt } from '@/lib/utils';");
menu = menu.replace(/formatNaira/g, "fmt");
menu = menu.replace(/toggleMenuItemAvailability\(\{.*?\}\)/g, "toggleMenuItemAvailability(m.id)");
fs.writeFileSync('components/restaurantos/management/MenuManager.tsx', menu);

// 3. Fix ModifierManager.tsx
let mod = fs.readFileSync('components/restaurantos/management/ModifierManager.tsx', 'utf8');
mod = mod.replace(/import \{ formatNaira \} from '@\/lib\/utils';/, "import { fmt } from '@/lib/utils';");
mod = mod.replace(/formatNaira/g, "fmt");
fs.writeFileSync('components/restaurantos/management/ModifierManager.tsx', mod);

// 4. Fix POSWorkspace.tsx
let pos = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');
pos = pos.replace(/handleAddWithModifiers/g, "handleModifierSelection"); // Check if handleModifierSelection exists
fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', pos);
