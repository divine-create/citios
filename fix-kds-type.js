import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/kds/KDSWorkspace.tsx', 'utf8');

const regex = /type Item = \{[\s\S]*?kitchenStatus:\s*'PENDING'\s*\|\s*'PREPARING'\s*\|\s*'READY'\s*\|\s*'COMPLETED'\s*\|\s*'CANCELLED';\s*\};/;
const newType = `type Item = {
  id: string;
  qty: number;
  itemName: string;
  variantName?: string | null;
  modifiers?: any[];
  notes: string | null;
  kitchenStation: string;
  kitchenStatus: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
};`;

if(regex.test(code)) {
  code = code.replace(regex, newType);
  fs.writeFileSync('components/restaurantos/kds/KDSWorkspace.tsx', code);
  console.log("Successfully updated KDS Item type!");
} else {
  console.log("Failed to match Item type!");
}
