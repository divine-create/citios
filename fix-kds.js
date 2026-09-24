import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/kds/KDSWorkspace.tsx', 'utf8');

// Update Item type
const typeOld = `type Item = {
    id: string;
    qty: number;
    itemName: string;
    notes: string | null;
    kitchenStation: string;
    kitchenStatus: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  };`;

const typeNew = `type Item = {
    id: string;
    qty: number;
    itemName: string;
    variantName?: string | null;
    modifiers?: any[];
    notes: string | null;
    kitchenStation: string;
    kitchenStatus: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  };`;
code = code.replace(typeOld, typeNew);

// Update render
const renderOld = `<p className={\`font-bold text-lg leading-tight \${isItemReady ? 'text-emerald-400 line-through' : 'text-white'}\`}>
                              {i.itemName}
                            </p>
                            {i.notes && (
                              <p className={\`text-sm font-bold uppercase mt-1 \${isItemReady ? 'text-emerald-600' : 'text-red-400'}\`}>
                                {i.notes}
                              </p>
                            )}`;

const renderNew = `<p className={\`font-bold text-lg leading-tight \${isItemReady ? 'text-emerald-400 line-through' : 'text-white'}\`}>
                              {i.itemName}
                            </p>
                            {i.variantName && (
                              <p className={\`text-sm font-semibold \${isItemReady ? 'text-emerald-500' : 'text-slate-300'}\`}>
                                {i.variantName}
                              </p>
                            )}
                            {i.modifiers && i.modifiers.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {i.modifiers.map((m: any) => (
                                  <p key={m.id} className={\`text-sm font-bold uppercase \${isItemReady ? 'text-emerald-600' : 'text-amber-400'}\`}>
                                    + {m.name}
                                  </p>
                                ))}
                              </div>
                            )}
                            {i.notes && (
                              <p className={\`text-sm font-bold uppercase mt-1 \${isItemReady ? 'text-emerald-600' : 'text-red-400'}\`}>
                                ! {i.notes}
                              </p>
                            )}`;
code = code.replace(renderOld, renderNew);

fs.writeFileSync('components/restaurantos/kds/KDSWorkspace.tsx', code);
