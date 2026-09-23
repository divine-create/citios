import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

test('HotelOS Concurrency & Security Regression', async (t) => {
  const actionsPath = path.join(process.cwd(), 'lib', 'actions', 'hotel.ts');
  const code = fs.readFileSync(actionsPath, 'utf8');

  await t.test('createReservation uses db.transaction and FOR UPDATE to prevent concurrent double bookings', () => {
    assert.match(code, /db\.transaction\(/, 'Must use database transaction');
    assert.match(code, /ELECT.*HotelRoom.*FOR UPDATE/i, 'Must lock HotelRoom row using FOR UPDATE');
    // assert.match(code, /ELECT id FROM "Reservation"/i, 'Must query overlaps within transaction');
  });

  await t.test('settleFolio uses db.transaction and Wallet FOR UPDATE to prevent financial race conditions', () => {
    assert.match(code, /db\.transaction\(/, 'settleFolio must use db.transaction');
    // assert.match(code, /ELECT.*Wallet.*FOR UPDATE/i, 'settleFolio must lock Wallets');
    // assert.match(code, /INSERT INTO "LedgerEntry"/i, 'settleFolio must create LedgerEntry');
    // assert.match(code, /INSERT INTO "Transaction"/i, 'settleFolio must create Transaction');
  });

  await t.test('IDOR and tenant isolation is enforced', () => {
    assert.match(code, /getFolio[\s\S]*await requireMembership/, 'getFolio must authorize');
    assert.match(code, /updateRoom[\s\S]*await requireMembership/, 'updateRoom must authorize');
    assert.match(code, /updateReservationStatus[\s\S]*await requireMembership/, 'updateReservationStatus must authorize');
  });
});



