const fs = require('fs');
let c = fs.readFileSync('lib/voice/intelligence/memory.ts', 'utf8');
c = c.replace(/updatedAt: new Date\(\)/g, "updatedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now())");
fs.writeFileSync('lib/voice/intelligence/memory.ts', c);
