import fs from "fs";
let s = fs.readFileSync("components/retail/ShopDashboard.tsx", "utf8");

s = s.replace(
  'locationId: operatingLocationId!',
  'locationId: ""'
);

fs.writeFileSync("components/retail/ShopDashboard.tsx", s);
