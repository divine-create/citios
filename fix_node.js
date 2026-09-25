const fs = require('fs');
let content = fs.readFileSync('components/restaurantos/management/MenuManager.tsx', 'utf8');

// The string to replace is literally "className={inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide }"
// And "{item.isAvailable ? 'Available' : '86'd'}"

content = content.replace(
  'className={inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide }',
  'className={inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide }'
);

content = content.replace(
  '{item.isAvailable ? \\'Available\\' : \\'86\\'d\\'}',
  '{item.isAvailable ? "Available" : "86\\'d"}'
);

fs.writeFileSync('components/restaurantos/management/MenuManager.tsx', content);
