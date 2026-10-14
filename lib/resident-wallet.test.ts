import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { getOrCreateResidentWallet, getResidentWallet, createResidentWalletFunding, getResidentWalletTransactions } from '../app/actions/resident_wallet';
import { Client } from 'pg';
import crypto from 'crypto';

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

let testPerson: any = null;

test('Resident Wallet API', async (t) => {
  await pgClient.connect();
  
  testPerson = await db.orm.public.Person.create({
    firstName: 'Test',
    lastName: 'Resident',
  });
  
  t.after(async () => {
    await pgClient.end();
  });

  await t.test('1. Idempotent wallet creation', async () => {
    const wallet1 = await getOrCreateResidentWallet(testPerson.id);
    assert.ok(wallet1.id, 'Wallet created');
    
    const wallet2 = await getOrCreateResidentWallet(testPerson.id);
    assert.strictEqual(wallet1.id, wallet2.id, 'Repeated call returns same wallet');
  });

  await t.test('2. Concurrent creation handles unique constraint safely', async () => {
    const concurrentPerson = await db.orm.public.Person.create({ firstName: 'Concurrent', lastName: 'Test' });
    const concurrentPersonId = concurrentPerson.id;
    const results = await Promise.all([
      getOrCreateResidentWallet(concurrentPersonId),
      getOrCreateResidentWallet(concurrentPersonId),
      getOrCreateResidentWallet(concurrentPersonId)
    ]);
    
    assert.strictEqual(results.length, 3);
    assert.strictEqual(results[0].id, results[1].id);
    assert.strictEqual(results[1].id, results[2].id);
  });

  await t.test('3. Initialize funding creates pending payment', async () => {
    try {
      const initResult = await createResidentWalletFunding(5000, 'MONNIFY', testPerson.id);
      assert.ok(initResult.checkoutUrl, 'Returns checkout URL');
      
      const wallet = await getResidentWallet(testPerson.id);
      assert.strictEqual(wallet?.pendingAmount, 5000, 'Pending amount reflects initialized funding');
    } catch (e: any) {
      if (e.message.includes('Monnify') || e.message.includes('fetch') || e.message.includes('MONNIFY_API_KEY')) {
         console.log('Skipping funding initialization due to missing keys or network');
      } else {
         throw e;
      }
    }
  });

  await t.test('4. Fetch wallet and transactions', async () => {
    const wallet = await getResidentWallet(testPerson.id);
    assert.ok(wallet, 'Wallet fetched');
    
    const { entries, total } = await getResidentWalletTransactions(1, 20, testPerson.id);
    assert.strictEqual(total, 0, 'No transactions initially');
    assert.strictEqual(entries.length, 0);
  });
});
