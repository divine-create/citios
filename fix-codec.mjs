import fs from 'fs';

let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');
content = content.replace(/'int4'/g, "'pg/int4@1'");
fs.writeFileSync('app/actions/commerce.ts', content);

let content2 = fs.readFileSync('lib/actions/retail.ts', 'utf8');
content2 = content2.replace(/'text'/g, "'pg/text@1'");
fs.writeFileSync('lib/actions/retail.ts', content2);
