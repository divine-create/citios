const fs = require('fs');
let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

content = content.replace(
  'let activeLocationId = input.locationId;\n  if (!activeLocationId) {',
  'let activeLocationId = input.locationId;\n  if (activeLocationId) {\n    const validLoc = await tx.orm.public.Location.where({ id: activeLocationId, organizationId: input.organizationId }).all().first();\n    if (!validLoc) throw new Error(\'Location does not belong to this organization.\');\n  }\n  if (!activeLocationId) {'
);
content = content.replace(
  'let activeLocationId = input.locationId;\r\n  if (!activeLocationId) {',
  'let activeLocationId = input.locationId;\r\n  if (activeLocationId) {\r\n    const validLoc = await tx.orm.public.Location.where({ id: activeLocationId, organizationId: input.organizationId }).all().first();\r\n    if (!validLoc) throw new Error(\'Location does not belong to this organization.\');\r\n  }\r\n  if (!activeLocationId) {'
);

fs.writeFileSync('lib/actions/retail.ts', content);
