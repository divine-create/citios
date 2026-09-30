import { db } from './src/prisma/db';
async function test() {
  const products = await db.orm.public.RetailProduct.all();
  const instock = products.filter(p => (p.stockQuantity || 0) > 0);
  console.log(`Total Products: ${products.length}`);
  console.log(`In-stock Products: ${instock.length}`);
  if (instock.length > 0) {
    console.log('Sample in-stock:', instock[0].id, instock[0].stockQuantity);
  }
}
test();
