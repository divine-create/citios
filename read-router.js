import fs from 'fs';

const routerCode = fs.readFileSync('app/(resident)/workspaces/[os]/[slug]/page.tsx', 'utf8');
console.log(routerCode);
