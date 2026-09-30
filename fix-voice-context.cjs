const fs = require('fs');
['lib/voice/tools/impl/services.ts'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/"VoiceContext"/g, '"voiceContext"');
  fs.writeFileSync(file, content);
});
