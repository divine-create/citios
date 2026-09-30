const fs = require('fs');
let code = fs.readFileSync('app/actions/food.ts', 'utf8');

code = code.replace(
  /  \/\/ @ts-ignore\s*  const orgs = await db\.orm\.public\.Organization\.where\(\{ \s*    \/\/ @ts-ignore\s*    id: \{ in: orgIdsWithLoc \},\s*    type: 'RESTAURANT'\s*  \}\)\.all\(\);/g,
  "  const allOrgs = await db.orm.public.Organization.where({ type: 'RESTAURANT' }).all();\n  const orgs = allOrgs.filter((o: any) => orgIdsWithLoc.includes(o.id));"
);

code = code.replace(
  /  \/\/ @ts-ignore - Prisma Next `in` operator on the ORM requires a ts-ignore\s*  const menus = await db\.orm\.public\.MenuItem\.where\(\{ organizationId: \{ in: orgIds \} \}\)\.all\(\);/g,
  "  const allMenus = await db.orm.public.MenuItem.all();\n  const menus = allMenus.filter((m: any) => orgIds.includes(m.organizationId));"
);

fs.writeFileSync('app/actions/food.ts', code);
