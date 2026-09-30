const fs = require('fs');
const file = 'lib/voice/core/context.ts';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(
  "  if (Date.now() - ctx.updatedAt.getTime() > 30 * 60 * 1000) {",
  "  const updatedEpochMs = typeof ctx.updatedAt.getTime === 'function' ? ctx.updatedAt.getTime() : (ctx.updatedAt as any).epochMilliseconds;\n  if (Date.now() - updatedEpochMs > 30 * 60 * 1000) {"
);
fs.writeFileSync(file, c);
