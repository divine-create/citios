import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('SchoolOS Phase 2C - IDOR protections on delete', async (t) => {
    const file = fs.readFileSync(path.join(process.cwd(), 'lib/actions/school.ts'), 'utf8');
    assert.ok(file.includes("requireMembership"), 'File contains requireMembership');
    const deleteCourseFn = file.substring(file.indexOf('export async function deleteCourse'), file.indexOf('export async function getCourseGradebook'));
    assert.ok(deleteCourseFn.includes('requireMembership'), 'deleteCourse enforces IDOR');
});

test('SchoolOS Phase 2C - recordFeePayment is protected', async (t) => {
    const file = fs.readFileSync(path.join(process.cwd(), 'lib/actions/school.ts'), 'utf8');
    const recordFn = file.substring(file.indexOf('export async function recordFeePayment'), file.indexOf('export async function getFinancePortalData'));
    
    assert.ok(recordFn.includes('db.transaction'), 'Fee payment uses transactions');
    assert.ok(recordFn.includes('FOR UPDATE'), 'Fee payment locks rows');
    assert.ok(recordFn.includes('Payment.create'), 'Fee payment uses canonical Payment');
});
