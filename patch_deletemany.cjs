const fs = require('fs');
let code = fs.readFileSync('lib/voice/cart.ts', 'utf8');

code = code.replace(
  "await db.orm.public.CartItem.where({ cartId: cart.id as string }).deleteMany();",
  "await db.orm.public.CartItem.where({ cartId: cart.id as string }).delete();"
);

code = code.replace(
  "await db.orm.public.CartCheckout.where({ cartId: cart.id as string }).deleteMany();",
  "await db.orm.public.CartCheckout.where({ cartId: cart.id as string }).delete();"
);

fs.writeFileSync('lib/voice/cart.ts', code);
