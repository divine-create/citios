const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // In app/actions/commerce.ts:
  // const plan = db.raw.sql`...`
  // const updated = await tx.execute(plan.build());
  // Need to change to: const plan = db.raw.sql`...`.returnsRow({ stockQuantity: 'int4' }).build(); const updated = await tx.execute(plan);

  content = content.replace(/const plan = db\.raw\.sql`([\s\S]*?)`/g, 'const plan = db.raw.sql`$1`.returnsRow({ stockQuantity: "int4" }).build()');
  // but wait, retail.ts cancelOrder needs { id: "text" }
  content = content.replace(/const plan = db\.raw\.sql`([\s\S]*?)RETURNING id\s*`\.returnsRow\(\{ stockQuantity: "int4" \}\)/g, 'const plan = db.raw.sql`$1RETURNING id`.returnsRow({ id: "text" })');
  
  content = content.replace(/const updated = await tx\.execute\(plan\.build\(\)\);/g, 'const updated = await tx.execute(plan);');

  fs.writeFileSync(file, content);
}

fixFile('app/actions/commerce.ts');
fixFile('lib/actions/retail.ts');
