import { db } from './src/prisma/db';
async function test() {
  const p = await db.orm.public.RetailProduct.all();
  console.log('Products:', p.length, p.slice(0, 2));
}
test();
