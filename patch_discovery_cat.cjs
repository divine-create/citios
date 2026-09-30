const fs = require('fs');
let code = fs.readFileSync('lib/voice/tools/impl/discovery.ts', 'utf8');

// Update searchCity inputSchema
code = code.replace(
  'category: { type: "string", description: "Optional category" }',
  'category: { type: "string", description: "Optional category. Allowed values: GOVERNMENT, SCHOOL, HEALTHCARE, RETAIL, RESTAURANT, REAL_ESTATE, SERVICES, LOGISTICS, HOTEL, EVENT_ORGANIZER, PUBLISHER, PHARMACY" }'
);

// Update searchCity execution to use the category
code = code.replace(
  "const res = await searchCityExplore(citySlug, query, 'All');",
  "const cat = typeof args.category === 'string' ? args.category : 'All';\n    const res = await searchCityExplore(citySlug, query, cat);"
);

// Also add limit parameter to searchCity
code = code.replace(
  "query: { type: \"string\", description: \"The search term\" },",
  "query: { type: \"string\", description: \"The search term\" },\n      limit: { type: \"number\", description: \"Optional number of results to return (default 5, max 10)\" },"
);

code = code.replace(
  "return { ok: true, data: combined.slice(0, 5) };",
  "const limit = Math.min(typeof args.limit === 'number' ? args.limit : 5, 10);\n    return { ok: true, data: combined.slice(0, limit) };"
);

fs.writeFileSync('lib/voice/tools/impl/discovery.ts', code);
