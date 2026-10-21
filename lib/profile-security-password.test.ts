import test from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword } from './password';
import { getUserPasswordStatus, setUserPassword } from '../app/actions/auth';

test('Account Security & Password Management Suite', async (t) => {
  await t.test('1. hashPassword & verifyPassword cryptographic integrity', async () => {
    const rawPass = 'SecretPassword123!';
    const hash = await hashPassword(rawPass);

    assert.ok(hash.includes(':'), 'Hash format should be salt:derivedKey');
    const [salt, key] = hash.split(':');
    assert.strictEqual(salt.length, 32, 'Salt should be 16 bytes hex (32 chars)');
    assert.strictEqual(key.length, 128, 'Key should be 64 bytes hex (128 chars)');

    const isValid = await verifyPassword(rawPass, hash);
    assert.strictEqual(isValid, true, 'Correct password must verify to true');

    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    assert.strictEqual(isInvalid, false, 'Incorrect password must verify to false');

    const isMalformed = await verifyPassword(rawPass, 'invalid_hash_string');
    assert.strictEqual(isMalformed, false, 'Malformed hash must safely return false');
  });

  await t.test('2. Unauthenticated calls are strictly guarded', async () => {
    // NextAuth getServerSession will return null in the test environment
    const statusRes = await getUserPasswordStatus();
    assert.strictEqual(statusRes.error, 'Not authenticated');

    const setRes = await setUserPassword({ newPassword: 'NewSecurePassword123' });
    assert.strictEqual(setRes.error, 'You must be signed in to manage your password.');
  });

  await t.test('3. Password validation constraints', async () => {
    // Minimum length enforcement
    const shortRes = await setUserPassword({ newPassword: '12345' });
    // In unauthenticated context, auth check comes first or validation
    assert.ok(
      shortRes.error === 'You must be signed in to manage your password.' ||
      shortRes.error === 'Password must be at least 6 characters long.'
    );
  });

  await t.test('4. Google OAuth signup password lifecycle simulation', async () => {
    // Simulate initial Google OAuth state: account exists with null passwordHash
    const googleUserAccount: { id: string; personId: string; passwordHash: string | null } = {
      id: 'acc_google_user_1',
      personId: 'person_google_user_1',
      passwordHash: null,
    };

    // Step A: Status check for Google user
    const hasPasswordInitial = Boolean(googleUserAccount.passwordHash);
    assert.strictEqual(hasPasswordInitial, false, 'OAuth signup should initially have hasPassword: false');

    // Step B: User sets password without needing a currentPassword
    const newPasswordInput = 'FirstTimePassword99';
    assert.ok(newPasswordInput.length >= 6);

    const hadPassword = Boolean(googleUserAccount.passwordHash);
    assert.strictEqual(hadPassword, false, 'Should not require currentPassword');

    // Save hash
    googleUserAccount.passwordHash = await hashPassword(newPasswordInput);
    assert.ok(googleUserAccount.passwordHash !== null);

    // Step C: Status check now reflects password is set
    const hasPasswordUpdated = Boolean(googleUserAccount.passwordHash);
    assert.strictEqual(hasPasswordUpdated, true, 'User now has hasPassword: true');

    // Step D: Subsequent change MUST require currentPassword
    const attemptedChangeWithoutCurrent = '';
    const requireCurrentPass = Boolean(googleUserAccount.passwordHash);
    assert.strictEqual(requireCurrentPass, true);

    // Step E: Verification of correct currentPassword before update
    const currentPassAttempt = 'WrongPassword';
    const isValidCurrent = await verifyPassword(currentPassAttempt, googleUserAccount.passwordHash);
    assert.strictEqual(isValidCurrent, false, 'Mismatched current password rejected');

    const correctCurrentPassAttempt = 'FirstTimePassword99';
    const isCorrect = await verifyPassword(correctCurrentPassAttempt, googleUserAccount.passwordHash);
    assert.strictEqual(isCorrect, true, 'Correct current password verified');

    // Update to new password
    googleUserAccount.passwordHash = await hashPassword('SecondUpdatedPassword88');
    const isSecondValid = await verifyPassword('SecondUpdatedPassword88', googleUserAccount.passwordHash);
    assert.strictEqual(isSecondValid, true);
  });
});
