const fs = require('fs');
const file = 'lib/voice/core/context.ts';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(
  "update({ data: newData as any, updatedAt: new Date() })",
  "update({ data: newData as any, updatedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) })"
);
fs.writeFileSync(file, c);
