import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

code = code.replace(
  /locationId:\s*org\.locations\?\.\[0\]\?\.id\s*\|\|\s*org\.id/g,
  "locationId: org.locations?.[0]?.id || undefined"
);

fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
