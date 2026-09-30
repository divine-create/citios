const fs = require('fs');

// 1. orchestrator.ts
let orch = fs.readFileSync('lib/voice/core/orchestrator.ts', 'utf8');
orch = orch.replace("status: 'awaiting_clarification',", "status: 'AWAITING_CLARIFICATION',");
fs.writeFileSync('lib/voice/core/orchestrator.ts', orch);

// 2. security.test.ts
let test = fs.readFileSync('lib/voice/core/security.test.ts', 'utf8');
// It currently ends with:
//   });
// });
//   await t.test('6. Phase 6...
// We just need to remove the first `});\n});` and append `});` to the end.
test = test.replace(/  \}\);\n\}\);\n  await t\.test\(/g, "  await t.test(");
test += "\n});\n";
fs.writeFileSync('lib/voice/core/security.test.ts', test);

// 3. services.ts
let srv = fs.readFileSync('lib/voice/tools/impl/services.ts', 'utf8');
srv = srv.replace("ctx.pendingAction?.action", "false");
srv = srv.replace("ctx.pendingAction.confirmationId", "null");
srv = srv.replace("ctx.pendingAction?.confirmationId", "null");
fs.writeFileSync('lib/voice/tools/impl/services.ts', srv);

// 4. system.ts
let sys = fs.readFileSync('lib/voice/tools/impl/system.ts', 'utf8');
sys = sys.replace("db.orm.public.Order.where", "db.orm.public.RetailOrder.where");
fs.writeFileSync('lib/voice/tools/impl/system.ts', sys);
