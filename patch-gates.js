import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regexInv = /export async function createInventoryItem\(input: \{[\s\S]*?\}\) \{\s*try \{\s*await requireMembership\(input\.organizationId, \['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF'\]\);/;
const replacementInv = `export async function createInventoryItem(input: {
  organizationId: string;
  name: string;
  unit: string;
  quantity: number;
  lowStockLevel: number;
  cost?: number;
  type?: 'RAW_MATERIAL' | 'SUB_ASSEMBLY' | 'FINISHED_GOOD';
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);
    await requireRestaurantCapability(input.organizationId, 'enableInventory');`;

const regexProd = /export async function createProductionRun\(input: \{[\s\S]*?\}\) \{\s*try \{\s*const \{ membership \} = await requireMembership\(input\.organizationId, \['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN', 'INVENTORY_STAFF'\], input\.locationId\);/;
const replacementProd = `export async function createProductionRun(input: {
  organizationId: string;
  recipeId: string;
  locationId?: string;
  plannedYield: number;
  actualYield: number;
  notes?: string;
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN', 'INVENTORY_STAFF'], input.locationId);
    await requireRestaurantCapability(input.organizationId, 'enableProduction');`;


let changed = false;
if (regexInv.test(code)) {
  code = code.replace(regexInv, replacementInv);
  changed = true;
}
if (regexProd.test(code)) {
  code = code.replace(regexProd, replacementProd);
  changed = true;
}

if (changed) {
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Patched inventory/production capability checks!");
} else {
  console.log("Regex missed!");
}
