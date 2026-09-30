const fs = require('fs');
let code = fs.readFileSync('app/actions/food.ts', 'utf8');

const target = code.split('\n').find(line => line.includes('MenuItem.where({ organizationId: { in: orgIds } }).all()'));
if (target) {
  code = code.replace(target, "  const allMenus = await db.orm.public.MenuItem.all();\n  const menus = allMenus.filter((m: any) => orgIds.includes(m.organizationId));");
}

fs.writeFileSync('app/actions/food.ts', code);
