const fs = require('fs');

let detail = fs.readFileSync('components/cityos/ProductDetail.tsx', 'utf8');

detail = detail.replace(
  /const \[p, setP\] = useState<any>\(null\);/g,
  `const [p, setP] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);`
);

detail = detail.replace(
  /const prod = await getCityMartProduct\(id\);\r?\n\s*setP\(prod\);/g,
  `const prod = await getCityMartProduct(id);
      setP(prod);
      if (prod?.variants?.length > 0) {
        setSelectedVariantId(prod.variants[0].id);
      }`
);

detail = detail.replace(
  /const handleAdd = \(\) => \{/g,
  `const activeProduct = p.variants?.length > 0 ? p.variants.find((v:any) => v.id === selectedVariantId) || p : p;
  
  const handleAdd = () => {`
);

detail = detail.replace(
  /productId: p\.id,\r?\n\s*name: p\.name,\r?\n\s*price: p\.price,\r?\n\s*qty,\r?\n\s*image: p\.imageAssetId,/g,
  `productId: activeProduct.id,
      name: p.variants?.length > 0 ? \`\${p.name} - \${activeProduct.variantName}\` : p.name,
      price: activeProduct.price,
      qty,
      image: p.imageAssetId,`
);

detail = detail.replace(
  /const isOutOfStock = !p\.isWeighed && \(p\.stockQuantity == null \|\| p\.stockQuantity <= 0\);\r?\n\s*const isLowStock = !p\.isWeighed && p\.stockQuantity > 0 && p\.stockQuantity <= 5;\r?\n\s*const maxQty = p\.isWeighed \? 99 : Math\.max\(1, p\.stockQuantity \?\? 1\);/g,
  `const isOutOfStock = !activeProduct.isWeighed && (activeProduct.stockQuantity == null || activeProduct.stockQuantity <= 0);
  const isLowStock = !activeProduct.isWeighed && activeProduct.stockQuantity > 0 && activeProduct.stockQuantity <= 5;
  const maxQty = activeProduct.isWeighed ? 99 : Math.max(1, activeProduct.stockQuantity ?? 1);`
);

detail = detail.replace(
  /<div className="flex items-center gap-3 pt-1">/g,
  `
        {p.variants && p.variants.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-black text-slate-700">Variant</h3>
            <div className="flex flex-wrap gap-2">
              {p.variants.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-sm font-bold transition-all",
                    selectedVariantId === v.id
                      ? "bg-teal-50 border-teal-200 text-teal-900 ring-2 ring-teal-500/20"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {v.variantName || 'Standard'}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">`
);

detail = detail.replace(
  /<div className="text-2xl font-black text-teal-900">\{fmt\(p\.price\)\}<\/div>/g,
  `<div className="text-2xl font-black text-teal-900">{fmt(activeProduct.price)}</div>
            {activeProduct.compareAtPrice && activeProduct.compareAtPrice > activeProduct.price && (
              <div className="text-lg font-bold text-slate-400 line-through">{fmt(activeProduct.compareAtPrice)}</div>
            )}`
);

fs.writeFileSync('components/cityos/ProductDetail.tsx', detail);

// Fix CityMarket variants and compare price
let market = fs.readFileSync('components/cityos/CityMarket.tsx', 'utf8');
market = market.replace(
  /<div className="text-sm font-black text-teal-900">\{fmt\(p\.price\)\}<\/div>/g,
  `<div className="text-sm font-black text-teal-900">{fmt(p.price)}</div>
                          {p.compareAtPrice && p.compareAtPrice > p.price && (
                            <div className="text-xs font-bold text-slate-400 line-through">{fmt(p.compareAtPrice)}</div>
                          )}`
);
fs.writeFileSync('components/cityos/CityMarket.tsx', market);

