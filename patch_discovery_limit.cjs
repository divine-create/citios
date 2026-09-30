const fs = require('fs');
let code = fs.readFileSync('lib/voice/tools/impl/discovery.ts', 'utf8');

// Patch searchBusinesses schema
code = code.replace(
  '      query: { type: "string", description: "The name or type of business" }',
  '      query: { type: "string", description: "The name or type of business" },\n      limit: { type: "number", description: "Optional number of results to return (default 5, max 10)" }'
);

// Patch searchBusinesses execute
code = code.replace(
  'const filtered = query ? stores.filter((s: any) =>',
  'const limit = Math.min(typeof args.limit === "number" ? args.limit : 5, 10);\n    const filtered = query ? stores.filter((s: any) =>'
);

code = code.replace(
  'return { ok: true, data: filtered.slice(0, 5).map((s: any) => ({',
  'return { ok: true, data: filtered.slice(0, limit).map((s: any) => ({'
);

fs.writeFileSync('lib/voice/tools/impl/discovery.ts', code);
