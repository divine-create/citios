import sys

with open('app/actions/commerce.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
in_block = False
for line in lines:
    if '// Check product stock availability' in line:
        out.append(line)
        out.append('''    // VALIDATE LOCATION OWNERSHIP FIRST
    if (input.locationId) {
      const loc = await db.orm.public.Location.where({ id: input.locationId, organizationId: product.organizationId }).all().first();
      if (!loc) throw new Error(Location not found or invalid for this product);
      
      const locStock = await db.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: item.productId }).all().first();
      if (!product.isWeighed && (!locStock || locStock.stockQuantity < item.qty)) {
        throw new Error(Only  item(s) left in stock for "".);
      }
    } else {
      if (!product.isWeighed && product.stockQuantity < item.qty) {
        if (product.stockQuantity <= 0) {
          throw new Error("" is currently out of stock.);
        }
        throw new Error(Only  item(s) left in stock for "".);
      }
    }
''')
        in_block = True
    elif in_block and '    const unitPrice = product.price;' in line:
        in_block = False
        out.append(line)
    elif not in_block:
        out.append(line)

with open('app/actions/commerce.ts', 'w', encoding='utf-8') as f:
    f.writelines(out)
