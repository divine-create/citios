const fs = require('fs');
let c = fs.readFileSync('lib/voice/tools/impl/account.ts', 'utf8');
c = c.replace(/args\.dueAt \? new Date\(args\.dueAt\) : undefined/g, "args.dueAt ? (globalThis as any).Temporal.Instant.from(args.dueAt) : undefined");
fs.writeFileSync('lib/voice/tools/impl/account.ts', c);
