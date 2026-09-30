const fs = require('fs');
let c = fs.readFileSync('src/prisma/contract.prisma', 'utf8');
c = c.replace('model Cart {', 'model Cart {\n  @@map("voiceCart")');
c = c.replace('model CartItem {', 'model CartItem {\n  @@map("voiceCartItem")');
c = c.replace('model CartCheckout {', 'model CartCheckout {\n  @@map("voiceCheckout")');
fs.writeFileSync('src/prisma/contract.prisma', c);
