const fs = require('fs');
let code = fs.readFileSync('app/actions/cart.ts', 'utf8');

const replacement = `export async function fetchUserCart() {
  const session = await getServerSession();
  if (!session?.user?.personId) return null;
  const { cart, subtotal } = await getVoiceCart(session.user.personId);
  
  const mappedLines = cart.items.map((item: any) => {
    const isRetail = item.kind === 'retail';
    const ref = isRetail ? item.product : item.menuItem;
    return {
      productId: isRetail ? item.retailProductId : item.menuItemId,
      qty: item.quantity,
      name: ref?.name || 'Unknown',
      price: ref?.price || 0,
      orgId: ref?.organizationId || '',
      orgName: ref?.organization?.name || 'Unknown Store',
      kind: item.kind,
      citySlug: cart.citySlug || undefined
    };
  });

  return { lines: mappedLines, subtotal, cartCitySlug: cart.citySlug };
}`;

code = code.replace(/export async function fetchUserCart\(\) \{[\s\S]*?return \{ cart, subtotal \};\n\}/, replacement);

fs.writeFileSync('app/actions/cart.ts', code);
