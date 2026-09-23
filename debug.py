import sys

with open('app/actions/commerce.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    '''console.log("PREFLIGHT:", locStock);
      if (!product.isWeighed && (!locStock || locStock.stockQuantity < item.qty)) {''',
    'if (!product.isWeighed && (!locStock || locStock.stockQuantity < item.qty)) {'
)

with open('app/actions/commerce.ts', 'w', encoding='utf-8') as f:
    f.write(c)
