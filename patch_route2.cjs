const fs = require('fs');
const file = 'app/api/voice/tools/route.ts';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(
  "return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to execute tool due to an internal error.' }, { status: 500 });",
  "return NextResponse.json({ error: 'INTERNAL_ERROR', message: String(err.stack || err.message || 'Failed to execute tool due to an internal error.') }, { status: 500 });"
);
fs.writeFileSync(file, c);
