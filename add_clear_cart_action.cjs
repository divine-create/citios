const fs = require('fs');
let code = fs.readFileSync('app/actions/cart.ts', 'utf8');

code = code.replace(
  "import { getVoiceCart, addVoiceCartItem, removeVoiceCartItem, updateVoiceCartQuantity } from '@/lib/voice/cart';",
  "import { getVoiceCart, addVoiceCartItem, removeVoiceCartItem, updateVoiceCartQuantity, clearVoiceCart } from '@/lib/voice/cart';"
);

code += `\nexport async function clearCartAction() {
  const session = await getServerSession();
  if (!session?.user?.personId) return;
  await clearVoiceCart(session.user.personId);
}\n`;

fs.writeFileSync('app/actions/cart.ts', code);
