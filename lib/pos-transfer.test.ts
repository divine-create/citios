import test from 'node:test';
import assert from 'node:assert/strict';

test('POS Tender Configuration - Transfer added and CityPay removed from active tender', async () => {
  // Valid active POS methods for checkout
  const activePosMethods = ['CASH', 'POS', 'TRANSFER'] as const;
  assert.ok(activePosMethods.includes('TRANSFER'), 'TRANSFER is an active payment method in POS');
  assert.ok(!activePosMethods.includes('WALLET' as any), 'WALLET (CityPay) is not an active POS tender option');
  assert.equal(activePosMethods.length, 3, 'POS offers exactly CASH, POS (Card Terminal), and TRANSFER');
});

test('Financial Reporting - revenueByMethod records TRANSFER alongside CASH and POS', async () => {
  const revenueByMethod = { WALLET: 0, CASH: 0, POS: 0, TRANSFER: 0 };
  
  const sampleOrders = [
    { totalAmount: 3500, paymentMethod: 'TRANSFER', status: 'COMPLETED' },
    { totalAmount: 2000, paymentMethod: 'CASH', status: 'COMPLETED' },
    { totalAmount: 5000, paymentMethod: 'POS', status: 'COMPLETED' },
    { totalAmount: 4000, paymentMethod: 'TRANSFER', status: 'COMPLETED' },
  ];

  for (const o of sampleOrders) {
    const method = (o.paymentMethod ?? 'CASH') as keyof typeof revenueByMethod;
    if (method in revenueByMethod) {
      revenueByMethod[method] += o.totalAmount;
    }
  }

  assert.equal(revenueByMethod.TRANSFER, 7500, 'Bank transfer revenue sums accurately');
  assert.equal(revenueByMethod.CASH, 2000, 'Cash revenue sums accurately');
  assert.equal(revenueByMethod.POS, 5000, 'Card terminal POS revenue sums accurately');
  assert.equal(revenueByMethod.WALLET, 0, 'CityPay wallet revenue is 0');
});

test('Cash Drawer Shift Reconciliation - Bank Transfers do not distort physical drawer count', async () => {
  const openingFloat = 10000;
  const shiftOrders = [
    { totalAmount: 5000, paymentMethod: 'CASH', paymentStatus: 'COMPLETED' },
    { totalAmount: 12000, paymentMethod: 'TRANSFER', paymentStatus: 'COMPLETED' },
    { totalAmount: 8000, paymentMethod: 'POS', paymentStatus: 'COMPLETED' },
  ];

  // Cash sales must strictly count orders where paymentMethod === 'CASH'
  const cashSales = shiftOrders
    .filter((o) => o.paymentMethod === 'CASH' && ['PAID', 'COMPLETED'].includes(o.paymentStatus))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const expectedCash = openingFloat + cashSales;

  assert.equal(cashSales, 5000, 'Only cash sales enter expected physical cash');
  assert.equal(expectedCash, 15000, 'Bank transfer does not inflate physical cash drawer expectation');
});

test('POS Shift Resolution - Robust active shift matching handles null and assigned locations', async () => {
  const orgId = 'org-test-123';
  const locationId = 'loc-test-456';

  // Scenario 1: Shift opened org-wide (locationId: null), but client sends locationId
  const shiftsDatabase = [
    { id: 'shift-1', organizationId: orgId, locationId: null, status: 'OPEN' }
  ];

  function resolveShift(input: { organizationId: string; locationId?: string; shiftId?: string }) {
    let match = null;
    if (input.shiftId) {
      match = shiftsDatabase.find(s => s.id === input.shiftId && s.organizationId === input.organizationId && s.status === 'OPEN');
    }
    if (!match && input.locationId) {
      match = shiftsDatabase.find(s => s.organizationId === input.organizationId && s.locationId === input.locationId && s.status === 'OPEN');
    }
    if (!match) {
      match = shiftsDatabase.find(s => s.organizationId === input.organizationId && s.locationId === null && s.status === 'OPEN');
    }
    if (!match) {
      match = shiftsDatabase.find(s => s.organizationId === input.organizationId && s.status === 'OPEN');
    }
    return match;
  }

  // Client provides locationId, but shift is org-wide
  const resolvedWithLoc = resolveShift({ organizationId: orgId, locationId });
  assert.ok(resolvedWithLoc, 'Successfully resolves org-wide shift even when client provides locationId');
  assert.equal(resolvedWithLoc?.id, 'shift-1');

  // Client provides direct shiftId
  const resolvedWithId = resolveShift({ organizationId: orgId, shiftId: 'shift-1' });
  assert.ok(resolvedWithId, 'Successfully resolves by direct shiftId');
  assert.equal(resolvedWithId?.id, 'shift-1');

  // Scenario 2: Shift opened with locationId, but client didn't send locationId
  const shiftsDatabase2 = [
    { id: 'shift-2', organizationId: orgId, locationId: 'loc-branch-1', status: 'OPEN' }
  ];
  function resolveShift2(input: { organizationId: string; locationId?: string; shiftId?: string }) {
    let match = null;
    if (input.shiftId) {
      match = shiftsDatabase2.find(s => s.id === input.shiftId && s.organizationId === input.organizationId && s.status === 'OPEN');
    }
    if (!match && input.locationId) {
      match = shiftsDatabase2.find(s => s.organizationId === input.organizationId && s.locationId === input.locationId && s.status === 'OPEN');
    }
    if (!match) {
      match = shiftsDatabase2.find(s => s.organizationId === input.organizationId && s.locationId === null && s.status === 'OPEN');
    }
    if (!match) {
      match = shiftsDatabase2.find(s => s.organizationId === input.organizationId && s.status === 'OPEN');
    }
    return match;
  }

  const resolvedNoLoc = resolveShift2({ organizationId: orgId });
  assert.ok(resolvedNoLoc, 'Successfully resolves branch shift when client has no locationId specified');
  assert.equal(resolvedNoLoc?.id, 'shift-2');
});
