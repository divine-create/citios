const fs = require('fs');
let c = fs.readFileSync('lib/voice/core/orchestrator.ts', 'utf8');
c = c.replace(
  /code: 'MISSING_INFORMATION',\s+message: `I need more information to proceed\. Missing: \$\{clarificationCheck\.missingFields\.join\([^)]+\)\}\.`/,
  "code: 'MISSING_INFORMATION', message: `I need more information to proceed. Missing: ${clarificationCheck.missingFields.join(', ')}.`, missingFields: clarificationCheck.missingFields"
);
fs.writeFileSync('lib/voice/core/orchestrator.ts', c);
