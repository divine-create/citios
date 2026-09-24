import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

code = code.replace(
  /tableId:\s*posType\s*===\s*'DINE_IN'\s*\?\s*\(posTableId\s*\|\|\s*undefined\)\s*:\s*undefined,/g,
  "...((posType === 'DINE_IN' && posTableId) ? { tableId: posTableId } : {}),"
);

fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
