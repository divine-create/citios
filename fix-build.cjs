const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\.build\(\)/g, '');
  fs.writeFileSync(file, content);
}

fixFile('app/actions/commerce.ts');
fixFile('lib/actions/retail.ts');
