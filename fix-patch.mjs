import fs from 'fs';

let p = fs.readFileSync('patch-all.mjs', 'utf8');
p = p.replace(/\\\\n/g, '\\n');
fs.writeFileSync('patch-all.mjs', p);
