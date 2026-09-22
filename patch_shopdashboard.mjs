// Fix ShopDashboard imports
import fs from "fs";
let s = fs.readFileSync("components/retail/ShopDashboard.tsx", "utf8");
s = s.replace(
  /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@\/lib\/actions\/retail['"]/,
  (match, imports) => {
    const procurementFuncs = [
      "getSuppliers", "createSupplier", "deleteSupplier",
      "getPurchaseOrders", "createPurchaseOrder", "updatePurchaseOrderStatus"
    ];
    let retailImports = [];
    let procurementImports = [];
    imports.split(',').forEach(imp => {
      const i = imp.trim();
      if (!i) return;
      if (procurementFuncs.includes(i)) procurementImports.push(i);
      else retailImports.push(i);
    });
    
    let res = `import { ${retailImports.join(", ")} } from '@/lib/actions/retail'`;
    if (procurementImports.length > 0) {
      res += `\nimport { ${procurementImports.join(", ")} } from '@/lib/actions/procurement'`;
    }
    return res;
  }
);
fs.writeFileSync("components/retail/ShopDashboard.tsx", s);

// Revert the export trick in retail.ts
let r = fs.readFileSync("lib/actions/retail.ts", "utf8");
const exportStart = r.indexOf("// Re-export procurement functions");
if (exportStart !== -1) {
  r = r.slice(0, exportStart);
  fs.writeFileSync("lib/actions/retail.ts", r);
}
