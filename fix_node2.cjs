const fs = require('fs');
let content = fs.readFileSync('components/restaurantos/management/MenuManager.tsx', 'utf8');

content = content.replace(
  'className={inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide }',
  'className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide ${item.isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}'
);

content = content.replace(
  "{item.isAvailable ? 'Available' : '86'd'}",
  '{item.isAvailable ? "Available" : "86\'d"}'
);

fs.writeFileSync('components/restaurantos/management/MenuManager.tsx', content);
