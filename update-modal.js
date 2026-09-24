import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

// Update state type to include cartId and modifiers
const stateDefOld = `const [posLines, setPosLines] = useState<{menuItemId: string, name: string, price: number, qty: number, notes: string}[]>([]);`;
const stateDefNew = `const [posLines, setPosLines] = useState<any[]>([]);`;
code = code.replace(stateDefOld, stateDefNew);

// Update methods to use cartId
const methodsOld = `const posQty = (id: string, qty: number) => {
      if (qty <= 0) {
        setPosLines(prev => prev.filter(p => p.menuItemId !== id));
        return;
      }
      setPosLines(prev => prev.map(p => p.menuItemId === id ? { ...p, qty } : p));
    };
  
    const posRemove = (id: string) => {
      setPosLines(prev => prev.filter(p => p.menuItemId !== id));
    };
  
    const updateNotes = (id: string, notes: string) => {
      setPosLines(prev => prev.map(p => p.menuItemId === id ? { ...p, notes } : p));
      setEditingNotesForId(null);
    };`;

const methodsNew = `const posQty = (cartId: string, qty: number) => {
      if (qty <= 0) {
        setPosLines(prev => prev.filter(p => p.cartId !== cartId));
        return;
      }
      setPosLines(prev => prev.map(p => p.cartId === cartId ? { ...p, qty } : p));
    };
  
    const posRemove = (cartId: string) => {
      setPosLines(prev => prev.filter(p => p.cartId !== cartId));
    };
  
    const updateNotes = (cartId: string, notes: string) => {
      setPosLines(prev => prev.map(p => p.cartId === cartId ? { ...p, notes } : p));
      setEditingNotesForId(null);
    };`;
code = code.replace(methodsOld, methodsNew);

// Create the ModifierSelectionModal component at the top of the file
const modalComponent = `
function ModifierSelectionModal({ item, onCancel, onAdd }: { item: any; onCancel: () => void; onAdd: (item: any, qty: number, variant: any, modifiers: any[], notes: string) => void }) {
  const [qty, setQty] = React.useState(1);
  const [selectedVariant, setSelectedVariant] = React.useState<any>(item.variants?.[0] || null);
  const [selectedModifiers, setSelectedModifiers] = React.useState<Set<string>>(new Set());
  const [notes, setNotes] = React.useState('');

  const toggleModifier = (mod: any, group: any) => {
    const next = new Set(selectedModifiers);
    if (next.has(mod.id)) {
      next.delete(mod.id);
    } else {
      if (group.maxSelections === 1) {
        group.options.forEach((o: any) => next.delete(o.id));
      }
      next.add(mod.id);
    }
    setSelectedModifiers(next);
  };

  const handleAdd = () => {
    const mods = [];
    if (item.modifierGroups) {
      for (const g of item.modifierGroups) {
        for (const o of g.options) {
          if (selectedModifiers.has(o.id)) mods.push(o);
        }
      }
    }
    onAdd(item, qty, selectedVariant, mods, notes);
  };

  let total = selectedVariant ? selectedVariant.price : item.price;
  if (item.modifierGroups) {
    for (const g of item.modifierGroups) {
      for (const o of g.options) {
        if (selectedModifiers.has(o.id)) total += o.priceDelta;
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-black text-slate-900">{item.name}</h2>
          <button onClick={onCancel} className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold">X</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {item.variants && item.variants.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">Size / Variant</h3>
              <div className="grid grid-cols-2 gap-3">
                {item.variants.map((v: any) => (
                  <button 
                    key={v.id} 
                    onClick={() => setSelectedVariant(v)}
                    className={\`p-4 rounded-xl border-2 font-bold flex justify-between items-center transition-all \${selectedVariant?.id === v.id ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'}\`}
                  >
                    <span>{v.name}</span>
                    <span>+{v.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.modifierGroups && item.modifierGroups.map((g: any) => (
            <div key={g.id} className="space-y-3">
              <div className="flex justify-between items-baseline">
                <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">{g.name}</h3>
                {g.isRequired && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase">Required</span>}
              </div>
              <div className="space-y-2">
                {g.options.map((o: any) => {
                  const isSelected = selectedModifiers.has(o.id);
                  return (
                    <button 
                      key={o.id}
                      onClick={() => toggleModifier(o, g)}
                      className={\`w-full p-4 rounded-xl border-2 font-bold flex justify-between items-center transition-all \${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'}\`}
                    >
                      <span>{o.name}</span>
                      {o.priceDelta > 0 && <span className="text-emerald-700">+{o.priceDelta}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-3">
            <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">Special Instructions</h3>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Allergy to peanuts, extra napkins..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:outline-none focus:border-slate-400 h-24"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-12 bg-white rounded-xl font-black text-xl shadow-sm">-</button>
            <span className="font-black text-xl w-6 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-12 h-12 bg-white rounded-xl font-black text-xl shadow-sm">+</button>
          </div>
          <button onClick={handleAdd} className="flex-1 bg-slate-900 text-white font-black text-lg h-16 rounded-2xl shadow-xl hover:bg-black transition-colors flex justify-between items-center px-6">
            <span>Add to Order</span>
            <span>{total * qty}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
`;
code = code.replace("export default function POSWorkspace", modalComponent + "\nexport default function POSWorkspace");

fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
