import fs from 'fs';

let c = fs.readFileSync('lib/actions/retail.ts', 'utf8');

c = c.replace(
  /await tx\.orm\.public\.LedgerEntry\.create\(\{[\s\S]+?description: `Sale #\$\{created\.id\.slice\(0, 8\)\}`\s*\}\);/g,
  "await tx.orm.public.LedgerEntry.create({ walletId: wallet.id, transactionId: transaction.id, amount: totalAmount, currency: 'USD' });"
);

fs.writeFileSync('lib/actions/retail.ts', c);
