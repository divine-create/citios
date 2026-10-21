import test from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import '@js-temporal/polyfill';
import { db } from '../src/prisma/db';
import { hashPassword, verifyPassword } from './password';
import { buildPasswordResetEmailHtml } from './email/resend';
import {
  requestPasswordReset,
  verifyResetToken,
  resetPasswordWithToken,
} from '../app/actions/auth';

function toTemporal(ms: number) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(ms);
}

test('Password Recovery & Resend Email Pipeline Suite', async (t) => {
  // Test fixture IDs
  const testPersonId = `test_person_pw_rec_${uuidv4().slice(0, 8)}`;
  const testEmail = `recovery.test.${uuidv4().slice(0, 8)}@cityos.test`;
  const initialPassword = 'InitialSecurePass123';

  t.before(async () => {
    // 1. Create test Person
    await db.orm.public.Person.create({
      id: testPersonId,
      firstName: 'Amina',
      lastName: 'Bello',
    });

    // 2. Create PersonIdentifier for email
    await db.orm.public.PersonIdentifier.create({
      id: uuidv4(),
      personId: testPersonId,
      type: 'EMAIL',
      normalizedValue: testEmail,
      isVerified: true,
    });

    // 3. Create initial Account
    const initialHash = await hashPassword(initialPassword);
    await db.orm.public.Account.create({
      id: uuidv4(),
      personId: testPersonId,
      passwordHash: initialHash,
      isActive: true,
    });
  });

  t.after(async () => {
    // Cleanup fixtures
    try {
      await db.orm.public.PasswordResetToken.where({ personId: testPersonId }).delete();
      await db.orm.public.Account.where({ personId: testPersonId }).delete();
      await db.orm.public.PersonIdentifier.where({ personId: testPersonId }).delete();
      await db.orm.public.Person.where({ id: testPersonId }).delete();
    } catch (e) {
      // Ignore cleanup error if already removed
    }
  });

  await t.test('1. buildPasswordResetEmailHtml template generation', () => {
    const resetUrl = 'https://9jalive.ng/reset-password?token=abcdef123456';
    const standardHtml = buildPasswordResetEmailHtml({
      recipientName: 'Amina Bello',
      resetUrl,
      isOAuthUser: false,
    });

    assert.ok(standardHtml.includes('Hello Amina Bello,'), 'Includes recipient greeting');
    assert.ok(standardHtml.includes(resetUrl), 'Includes reset URL');
    assert.ok(standardHtml.includes('30 minutes'), 'Includes 30-minute expiry warning');
    assert.ok(standardHtml.includes('9jaLive'), 'Includes branding');
    assert.ok(!standardHtml.includes('Google Account Notice'), 'Standard user has no OAuth banner');

    const oauthHtml = buildPasswordResetEmailHtml({
      recipientName: 'Emeka Obi',
      resetUrl,
      isOAuthUser: true,
    });
    assert.ok(oauthHtml.includes('Google Account Notice'), 'OAuth user receives Google account guidance');
  });

  await t.test('2. requestPasswordReset rejects invalid emails & protects user enumeration', async () => {
    // Invalid email format
    const invalidRes = await requestPasswordReset({ email: 'not-an-email' });
    assert.strictEqual(invalidRes.error, 'Please enter a valid email address.');

    // Non-existent email returns generic success (prevents enumeration)
    const nonExistentRes = await requestPasswordReset({ email: 'nonexistent999@domain.xyz' });
    assert.strictEqual(nonExistentRes.success, true);
    assert.ok(nonExistentRes.message.includes('If an account exists'));
  });

  await t.test('3. requestPasswordReset creates secure token and dispatches email', async () => {
    const res = await requestPasswordReset({ email: testEmail });
    assert.strictEqual(res.success, true);

    // Verify token was stored in database
    const tokens = await db.orm.public.PasswordResetToken
      .where({ personId: testPersonId })
      .all();

    assert.ok(tokens.length >= 1, 'At least one reset token created');
    const latestToken = tokens[tokens.length - 1];
    assert.strictEqual(latestToken.email, testEmail);
    assert.strictEqual(latestToken.usedAt, null);
  });

  await t.test('4. verifyResetToken enforces token validity and expiry constraints', async () => {
    // Malformed token length
    const shortTokenRes = await verifyResetToken('too-short-token');
    assert.strictEqual(shortTokenRes.valid, false);

    // Non-existent token (64 hex chars)
    const fakeToken = crypto.randomBytes(32).toString('hex');
    const fakeTokenRes = await verifyResetToken(fakeToken);
    assert.strictEqual(fakeTokenRes.valid, false);

    // Valid token
    const validRawToken = crypto.randomBytes(32).toString('hex');
    const validHash = crypto.createHash('sha256').update(validRawToken).digest('hex');
    await db.orm.public.PasswordResetToken.create({
      id: uuidv4(),
      personId: testPersonId,
      email: testEmail,
      tokenHash: validHash,
      expiresAt: toTemporal(Date.now() + 15 * 60 * 1000), // 15 mins
    });

    const verifySuccess = await verifyResetToken(validRawToken);
    assert.strictEqual(verifySuccess.valid, true);
    assert.ok(verifySuccess.email.includes('@'), 'Returns masked email');

    // Expired token
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    await db.orm.public.PasswordResetToken.create({
      id: uuidv4(),
      personId: testPersonId,
      email: testEmail,
      tokenHash: expiredHash,
      expiresAt: toTemporal(Date.now() - 60 * 1000), // expired 1 min ago
    });

    const expiredRes = await verifyResetToken(expiredRawToken);
    assert.strictEqual(expiredRes.valid, false);
    assert.ok(expiredRes.error?.includes('expired'));
  });

  await t.test('5. resetPasswordWithToken updates password and consumes token', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await db.orm.public.PasswordResetToken.create({
      id: uuidv4(),
      personId: testPersonId,
      email: testEmail,
      tokenHash,
      expiresAt: toTemporal(Date.now() + 15 * 60 * 1000),
    });

    const newPassword = 'BrandNewPassword987!';

    // Reset password
    const resetRes = await resetPasswordWithToken({
      token: rawToken,
      newPassword,
    });

    assert.strictEqual(resetRes.success, true);

    // Verify token is now marked used
    const consumedToken = await db.orm.public.PasswordResetToken
      .where({ tokenHash })
      .all()
      .first();

    assert.ok(consumedToken?.usedAt !== null, 'Token marked as used');

    // Verify cannot re-use token
    const reVerify = await verifyResetToken(rawToken);
    assert.strictEqual(reVerify.valid, false);
    assert.ok(reVerify.error?.includes('already been used'));

    // Verify account passwordHash actually changed and matches new password
    const account = await db.orm.public.Account
      .where({ personId: testPersonId })
      .all()
      .first();

    const isOldValid = await verifyPassword(initialPassword, account.passwordHash);
    assert.strictEqual(isOldValid, false, 'Old password must no longer work');

    const isNewValid = await verifyPassword(newPassword, account.passwordHash);
    assert.strictEqual(isNewValid, true, 'New password must verify successfully');
  });
});
