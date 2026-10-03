const fs = require('fs');
let content = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');

// Add variants and compareAtPrice to form state
content = content.replace(
  /const EMPTY_FORM = \{ name: "", sku: "", categoryId: "", price: "", cost: "", stockQuantity: "", lowStockLevel: "", isWeighed: false, unit: "ea" \};/,
  `const EMPTY_FORM = { name: "", sku: "", categoryId: "", price: "", compareAtPrice: "", cost: "", stockQuantity: "", lowStockLevel: "", isWeighed: false, unit: "ea", variants: [] as any[] };`
);

// Add compareAtPrice input
content = content.replace(
  /<div>\s*<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">\s*Price \(\{symbol\}\)\s*<\/label>\s*<input\s*type="number"/,
  `<div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Price ({symbol})
                            </label>
                            <input
                              type="number"`
);

content = content.replace(
  /placeholder="0\.00"\s*\/>\s*<\/div>\s*<div>\s*<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">\s*Cost \(\{symbol\}\)\s*<\/label>/,
  `placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Compare At ({symbol})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.compareAtPrice}
                              onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                              className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Cost ({symbol})
                            </label>`
);

// Add variants UI in the form
const variantUI = `
                          <div className="md:col-span-2 pt-4 border-t border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Variants
                            </label>
                            {form.variants.map((v, i) => (
                              <div key={i} className="flex gap-2 mb-2">
                                <input placeholder="Variant Name" value={v.variantName} onChange={e => { const nv = [...form.variants]; nv[i].variantName = e.target.value; setForm({...form, variants: nv}); }} className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200" />
                                <input placeholder="Price" type="number" step="0.01" value={v.price} onChange={e => { const nv = [...form.variants]; nv[i].price = e.target.value; setForm({...form, variants: nv}); }} className="w-24 bg-slate-50 p-2 rounded-lg border border-slate-200" />
                                <input placeholder="Stock" type="number" value={v.stockQuantity} onChange={e => { const nv = [...form.variants]; nv[i].stockQuantity = e.target.value; setForm({...form, variants: nv}); }} className="w-24 bg-slate-50 p-2 rounded-lg border border-slate-200" />
                                <button type="button" onClick={() => { const nv = [...form.variants]; nv.splice(i, 1); setForm({...form, variants: nv}); }} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setForm({...form, variants: [...form.variants, {variantName: '', price: form.price, stockQuantity: ''}]})} className="text-sm font-bold text-teal-600 flex items-center gap-1"><Plus size={16}/> Add Variant</button>
                          </div>
`;
content = content.replace(
  /<\/div>\s*<\/div>\s*<div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">/,
  `</div>
                          ${variantUI}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">`
);

// Update save payload
content = content.replace(
  /const payload = \{([\s\S]*?)unit: form\.unit,\s*\};/,
  `const payload = {$1unit: form.unit, compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null, variants: form.variants };`
);

// Edit populator
content = content.replace(
  /setForm\(\{([\s\S]*?)unit: p\.unit \|\| "ea",\s*\}\);/,
  `setForm({$1unit: p.unit || "ea", compareAtPrice: String(p.compareAtPrice || ""), variants: p.variants || [] });`
);

fs.writeFileSync('components/retail/InventoryManager.tsx', content);
