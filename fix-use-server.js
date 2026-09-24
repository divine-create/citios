import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// The helpers were added before 'use server'. We need to move 'use server'; back to the very top.
code = code.replace(/'use server';\s*/g, '');
code = "'use server';\n\n" + code;

fs.writeFileSync('lib/actions/restaurantos.ts', code);
