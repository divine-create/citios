import fs from 'fs';

let rawMatCode = fs.readFileSync('components/restaurantos/forms/RawMaterialIntake.tsx', 'utf8');

rawMatCode = rawMatCode.replace(
  "import { createInventoryItem } from '@/lib/actions/restaurantos';",
  "import { createInventoryItem } from '@/lib/actions/restaurantos';\nimport { POPULAR_UOMS } from './UOMConstants';"
);

rawMatCode = rawMatCode.replace(
  /<select className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" value=\{unit\} onChange=\{e => setUnit\(e.target.value\)\}>[\s\S]*?<\/select>/,
  `<select className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" value={unit} onChange={e => setUnit(e.target.value)}>
            {POPULAR_UOMS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>`
);

fs.writeFileSync('components/restaurantos/forms/RawMaterialIntake.tsx', rawMatCode);
