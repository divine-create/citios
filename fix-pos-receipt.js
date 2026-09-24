import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

code = code.replace(
  /items:\s*posLines\.map\(\(l:\s*any\)\s*=>\s*\(\{\s*name:\s*l\.name,\s*qty:\s*l\.qty,\s*price:\s*l\.price\s*\}\)\),/,
  `items: posLines.map((l: any) => ({ name: l.name, quantity: l.qty, unitPrice: l.price, subtotal: l.qty * l.price })),
            subtotal: posSubtotal,`
);

fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
