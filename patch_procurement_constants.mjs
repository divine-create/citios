import fs from "fs";
let s = fs.readFileSync("lib/actions/entitlements.ts", "utf8");
if (!s.includes("CITYMART_PROCUREMENT")) {
  s = s + `\nexport const FEAT_PROCUREMENT = 'CITYMART_PROCUREMENT';\nexport const FEAT_MULTI_LOCATION = 'CITYMART_MULTI_LOCATION';\nexport const LIMIT_PRODUCTS = 'CITYMART_PRODUCTS';\n`;
  fs.writeFileSync("lib/actions/entitlements.ts", s);
}

let p = fs.readFileSync("lib/actions/procurement.ts", "utf8");
p = p.replace("export const FEAT_PROCUREMENT = 'CITYMART_PROCUREMENT';", "const FEAT_PROCUREMENT = 'CITYMART_PROCUREMENT';");
p = p.replace("export const FEAT_MULTI_LOCATION = 'CITYMART_MULTI_LOCATION';", "const FEAT_MULTI_LOCATION = 'CITYMART_MULTI_LOCATION';");
p = p.replace("export const LIMIT_PRODUCTS = 'CITYMART_PRODUCTS';", "const LIMIT_PRODUCTS = 'CITYMART_PRODUCTS';");
fs.writeFileSync("lib/actions/procurement.ts", p);
