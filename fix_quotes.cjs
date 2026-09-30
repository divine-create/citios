const fs = require('fs');
let code = fs.readFileSync('lib/voice/tools/impl/logistics.ts', 'utf8');
code = code.replace("Lists the resident\\'s ongoing", "Lists the resident's ongoing");
code = code.replace("'Lists the resident's ongoing", "\"Lists the resident's ongoing");
code = code.replace("shipments.',", "shipments.\",");
fs.writeFileSync('lib/voice/tools/impl/logistics.ts', code);
