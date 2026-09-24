import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

code = code.replace(
  /locationId:\s*org\.locations\?\.\[0\]\?\.id\s*\|\|\s*undefined,/g,
  "...(org.locations?.[0]?.id ? { locationId: org.locations[0].id } : {}),"
);

fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
