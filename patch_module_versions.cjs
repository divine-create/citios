const fs = require('fs');
 // Note: if glob not available, I can just use a simple list
const paths = [
  'lib/voice/modules/account/index.ts',
  'lib/voice/modules/commerce/index.ts',
  'lib/voice/modules/discovery/index.ts',
  'lib/voice/modules/hotels/index.ts',
  'lib/voice/modules/logistics/index.ts',
  'lib/voice/modules/services/index.ts',
  'lib/voice/modules/system/index.ts'
];

paths.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes("version: '1.0.0'")) {
     content = content.replace(/VoiceModule = \{\s*id:/, "VoiceModule = {\n  version: '1.0.0',\n  id:");
     fs.writeFileSync(p, content);
     console.log("Updated", p);
  }
});
