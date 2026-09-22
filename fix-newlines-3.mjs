import fs from 'fs';

let c = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');
c = c.replace(/\\n/g, '\n');
fs.writeFileSync('components/retail/ShopDashboard.tsx', c);
console.log('Fixed literal \\n characters in ShopDashboard.tsx');
