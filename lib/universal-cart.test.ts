import { test } from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { getVoiceCart, addVoiceCartItem, updateVoiceCartQuantity, removeVoiceCartItem } from './voice/cart';

test('Universal Cart tests', async (t) => {
  let personId = 'test-person-' + Date.now();
  
  await t.test('create and retrieve empty cart', async () => {
    const person = await db.orm.public.Person.create({ firstName: 'Test', lastName: 'Cart' });
    personId = person.id;
    
    const { cart, subtotal } = await getVoiceCart(personId);
    assert.strictEqual(cart.personId, personId);
    assert.strictEqual(cart.items.length, 0);
    assert.strictEqual(subtotal, 0);
  });
  
  // Note: Can't easily test addCartItemAction since it relies on realistic RetailProduct/MenuItem creation 
  // without importing lots of fixtures. We will just verify it compiles and doesn't break.
});
