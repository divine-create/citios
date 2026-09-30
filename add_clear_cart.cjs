const fs = require('fs');
let code = fs.readFileSync('lib/voice/cart.ts', 'utf8');

code += `\nexport async function clearVoiceCart(personId: string) {
  const cart = await db.orm.public.Cart.where({ personId }).first();
  if (cart) {
    await db.orm.public.CartItem.where({ cartId: cart.id as string }).deleteMany();
    await db.orm.public.CartCheckout.where({ cartId: cart.id as string }).deleteMany();
  }
}\n`;

fs.writeFileSync('lib/voice/cart.ts', code);
