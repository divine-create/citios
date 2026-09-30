const fs = require('fs');
const file = 'lib/voice/core/orchestrator.ts';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(
  "return { ok: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'An internal error occurred while executing this tool.' } };",
  "return { ok: false, error: { code: 'INTERNAL_ERROR', message: String(err.stack || err.message || 'An internal error occurred while executing this tool.') } };"
);
fs.writeFileSync(file, c);
