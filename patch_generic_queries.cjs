const fs = require('fs');
let code = fs.readFileSync('lib/voice/tools/impl/discovery.ts', 'utf8');

function addGenericFilter(toolName, genericWords) {
  const genericArrayStr = JSON.stringify(genericWords);
  const patch = `const q = typeof args.query === 'string' ? args.query.toLowerCase().trim() : '';\n    const query = ${genericArrayStr}.includes(q) ? '' : q;`;
  
  // Find the line: const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
  code = code.replace(/const query = typeof args\.query === 'string' \? args\.query\.toLowerCase\(\) : '';/g, patch);
}

// Just replace it globally for all tools in discovery.ts
const patch = `let query = typeof args.query === 'string' ? args.query.toLowerCase().trim() : '';
    const genericTerms = ['restaurant', 'restaurants', 'business', 'businesses', 'store', 'stores', 'food', 'foods', 'place', 'places', 'shop', 'shops', 'market', 'markets'];
    if (genericTerms.includes(query)) query = '';`;

code = code.replace(/const query = typeof args\.query === 'string' \? args\.query\.toLowerCase\(\) : '';/g, patch);

// For searchCity which has args.query || '' directly
code = code.replace(
  /const res = await searchCityExplore\(citySlug, args\.query \|\| '', 'All'\);/g,
  "let query = (args.query || '').toLowerCase().trim();\n    if (['restaurant', 'restaurants', 'business', 'businesses', 'store', 'stores', 'food', 'foods', 'place', 'places'].includes(query)) query = '';\n    const res = await searchCityExplore(citySlug, query, 'All');"
);

fs.writeFileSync('lib/voice/tools/impl/discovery.ts', code);
