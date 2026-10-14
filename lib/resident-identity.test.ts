import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { resolvePersonByEmail } from '../lib/identity';
import { Client } from 'pg';
import crypto from 'crypto';

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

test('Resident MVP Identity & Profile API', async (t) => {
  await pgClient.connect();
  
  t.after(async () => {
    await pgClient.end();
  });

  let testEmail = `test.resident.${crypto.randomUUID()}@example.com`;
  let personId: string;

  await t.test('1. Resolve/create Person from email (Authentication phase)', async () => {
    // This simulates the jwt callback in next-auth creating the Person
    const person = await resolvePersonByEmail(testEmail, 'Test Resident');
    assert.ok(person, 'Person should be created/resolved');
    assert.ok(person.id, 'Person should have an ID');
    assert.strictEqual(person.firstName, 'Test');
    assert.strictEqual(person.lastName, 'Resident');
    personId = person.id;
  });

  await t.test('2. Idempotent Person resolution', async () => {
    const personAgain = await resolvePersonByEmail(testEmail, 'Test Resident');
    assert.strictEqual(personAgain?.id, personId, 'Should resolve to the same Person ID');
  });

  await t.test('3. Profile fetching logic (mock getProfileAndWallet)', async () => {
    const person = await db.orm.public.Person.where({ id: personId }).all().first();
    assert.ok(person);
    
    // Check if ResidentProfile exists, which is normally created in jwt callback or updateFullProfile
    let profile = await db.orm.public.ResidentProfile.where({ personId }).all().first();
    if (!profile) {
      profile = await db.orm.public.ResidentProfile.create({ personId });
    }
    assert.ok(profile, 'ResidentProfile exists');
    assert.strictEqual(profile.onboardingComplete, false, 'Defaults to false');
  });
});
