const fs = require('fs');
let code = fs.readFileSync('lib/voice/tools/impl/discovery.ts', 'utf8');

code = code.replace(
  "async function getResidentCitySlug",
  "export async function getResidentCitySlug"
);

fs.writeFileSync('lib/voice/tools/impl/discovery.ts', code);
