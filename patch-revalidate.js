import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

code = code.replace(/revalidatePath\('\/admin\/restaurantos'\)/g, "revalidatePath('/', 'layout')");

fs.writeFileSync('lib/actions/restaurantos.ts', code);
console.log("Patched revalidation paths!");
