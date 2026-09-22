import fs from "fs";
let s = fs.readFileSync("lib/actions/retail.ts", "utf8");
const startMarker = "// Suppliers & Purchase Orders";
const endMarker = "// Coupons / Discounts";
const startIdx = s.indexOf(startMarker);
const endIdx = s.indexOf(endMarker);
if (startIdx !== -1 && endIdx !== -1) {
  // Move back to include the separator lines
  const finalStart = s.lastIndexOf("// --------", startIdx);
  const finalEnd = s.lastIndexOf("// --------", endIdx);
  s = s.slice(0, finalStart) + s.slice(finalEnd);
  fs.writeFileSync("lib/actions/retail.ts", s);
  console.log("Removed obsolete procurement block.");
} else {
  console.log("Markers not found");
}
