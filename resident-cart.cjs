const fs = require('fs');

// Fix CartView
let cart = fs.readFileSync('components/cityos/CartView.tsx', 'utf8');
cart = cart.replace(
  /<div className="flex-1">\s*<h3 className="text-sm font-bold text-ink">\{item\.name\}<\/h3>\s*<div className="flex items-center gap-2 mt-1">/g,
  `<div className="flex-1">
                          <h3 className="text-sm font-bold text-ink">{item.name}</h3>
                          {item.variantName && <p className="text-[11px] font-bold text-slate-500 mt-0.5">{item.variantName}</p>}
                          <div className="flex items-center gap-2 mt-1">`
);
fs.writeFileSync('components/cityos/CartView.tsx', cart);

// Fix CheckoutView
let checkout = fs.readFileSync('components/cityos/CheckoutView.tsx', 'utf8');
checkout = checkout.replace(
  /<span className="text-xs font-bold text-slate-400">\{item\.qty\}x<\/span>\s*<span className="text-sm font-bold text-ink truncate flex-1">\{item\.name\}<\/span>/g,
  `<span className="text-xs font-bold text-slate-400">{item.qty}x</span>
                            <div className="flex flex-col flex-1 overflow-hidden">
                              <span className="text-sm font-bold text-ink truncate">{item.name}</span>
                              {item.variantName && <span className="text-[10px] font-bold text-slate-400 truncate">{item.variantName}</span>}
                            </div>`
);
fs.writeFileSync('components/cityos/CheckoutView.tsx', checkout);
