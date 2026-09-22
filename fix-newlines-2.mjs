import fs from 'fs';

for (const file of ['lib/actions/retail.ts', 'components/retail/POSTerminal.tsx', 'components/retail/InventoryManager.tsx']) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\\n/g, '\n');
  fs.writeFileSync(file, c);
}
console.log('Fixed literal \\n characters CORRECTLY');
