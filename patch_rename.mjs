import fs from 'fs';
let code = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');
code = code.replace(/ShopOS<\/span>/, 'CityMart</span>');
code = code.replace(/ShopOS dashboard/, 'CityMart dashboard');
fs.writeFileSync('components/retail/ShopDashboard.tsx', code);
