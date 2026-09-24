import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

code = code.replace(
  /citySlug: city\.slug,\s*isHQ: true,/g,
  ""
);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
