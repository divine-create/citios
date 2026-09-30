const fs = require('fs');
let text = fs.readFileSync('lib/voice/core/security.test.ts', 'utf8');
text = text.replace("});\r\n\r\n  await t.test('6", "  await t.test('6");
text = text.replace("});\n\n  await t.test('6", "  await t.test('6");
fs.writeFileSync('lib/voice/core/security.test.ts', text);
