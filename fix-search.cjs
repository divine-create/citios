const fs = require('fs');
let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');

content = content.replace(
  "const products = allProducts.filter((p: any) => orgIds.includes(p.organizationId) && (cat === 'All' || p.globalCategory === cat));\n    return products.map(p => {",
  "const products = allProducts.filter((p: any) => orgIds.includes(p.organizationId) && (cat === 'All' || p.globalCategory === cat));\n\n    const allStock = await db.orm.public.RetailLocationStock.all();\n\n    return products.map(p => {\n      const pStock = allStock.filter((s: any) => s.productId === p.id && locs.some((l: any) => l.id === s.locationId));\n      const available = pStock.reduce((acc, s) => acc + s.stockQuantity, 0);\n      if (available <= 0 && !p.isWeighed) return null;\n\n      const org = orgs.find(o => o.id === p.organizationId);"
);

content = content.replace(
  "orgSlug: org?.id,\n    };\n  });",
  "orgSlug: org?.id,\n        available,\n      };\n    }).filter(Boolean);"
);

fs.writeFileSync('app/actions/commerce.ts', content);
