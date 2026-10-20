import test from 'node:test';
import assert from 'node:assert';
import { getTwoLetterInitials, getAvatarGradient, AVATAR_GRADIENTS } from '../components/cityos/CityUI';
import { fetchFeed } from '../app/actions/newsfeed';

test('Avatar Two-Letter Initials & Gradient System', async (t) => {
  await t.test('1. Two-word and multi-word names extract the first letters of first two words', () => {
    assert.strictEqual(getTwoLetterInitials('Destinee Medical'), 'DM');
    assert.strictEqual(getTwoLetterInitials('Cross River State'), 'CR');
    assert.strictEqual(getTwoLetterInitials('Calabar Tech Hub'), 'CT');
    assert.strictEqual(getTwoLetterInitials('Crunchies Fried Chicken'), 'CF');
    assert.strictEqual(getTwoLetterInitials('First Bank of Nigeria'), 'FB');
  });

  await t.test('2. Single-word names extract the first two letters', () => {
    assert.strictEqual(getTwoLetterInitials('Calabar'), 'CA');
    assert.strictEqual(getTwoLetterInitials('Spar'), 'SP');
    assert.strictEqual(getTwoLetterInitials('Dominos'), 'DO');
    assert.strictEqual(getTwoLetterInitials('Flutterwave'), 'FL');
  });

  await t.test('3. Single-character names return the uppercase character', () => {
    assert.strictEqual(getTwoLetterInitials('A'), 'A');
    assert.strictEqual(getTwoLetterInitials('z'), 'Z');
  });

  await t.test('4. Special characters, punctuation, and parentheses are cleanly sanitized', () => {
    assert.strictEqual(getTwoLetterInitials('(Destinee) Clinic'), 'DC');
    assert.strictEqual(getTwoLetterInitials('[Calabar] Tech'), 'CT');
    assert.strictEqual(getTwoLetterInitials('Dr. Jane Doe'), 'DJ');
    assert.strictEqual(getTwoLetterInitials('"Big" Bites'), 'BB');
    assert.strictEqual(getTwoLetterInitials('@CrossRiver'), 'CR');
  });

  await t.test('5. Alphanumeric and brand numbers extract correctly', () => {
    assert.strictEqual(getTwoLetterInitials('9ja Live'), '9L');
    assert.strictEqual(getTwoLetterInitials('9jaLive'), '9J');
    assert.strictEqual(getTwoLetterInitials('7 Eleven'), '7E');
  });

  await t.test('6. Null, undefined, empty, or whitespace-only strings fallback to 9L', () => {
    assert.strictEqual(getTwoLetterInitials(null), '9L');
    assert.strictEqual(getTwoLetterInitials(undefined), '9L');
    assert.strictEqual(getTwoLetterInitials(''), '9L');
    assert.strictEqual(getTwoLetterInitials('   '), '9L');
  });

  await t.test('7. Deterministic avatar gradients produce valid and consistent Tailwind classes', () => {
    assert.ok(AVATAR_GRADIENTS.length >= 8, 'At least 8 gradients available');

    // Determinism
    const grad1 = getAvatarGradient('Destinee Medical');
    const grad2 = getAvatarGradient('Destinee Medical');
    assert.strictEqual(grad1, grad2, 'Gradient generation must be deterministic');
    assert.ok(AVATAR_GRADIENTS.includes(grad1 as any), 'Gradient must belong to predefined palette');

    // Diversity
    const samples = ['Crunchies', 'Cross River State', 'Calabar Tech Hub', 'Spar', 'Tinapa Resort', 'Destinee'];
    const assignedGradients = new Set(samples.map(s => getAvatarGradient(s)));
    assert.ok(assignedGradients.size >= 3, 'Different names should span multiple gradients');
  });

  await t.test('8. Newsfeed posts without profile picture resolve valid initials and gradients', async () => {
    const feed = await fetchFeed('For You', 'All', undefined, 30);
    assert.ok(feed.posts.length > 0, 'Feed should return posts');

    for (const post of feed.posts) {
      const initials = getTwoLetterInitials(post.author);
      const gradient = getAvatarGradient(post.author);

      assert.ok(initials.length >= 1 && initials.length <= 2, `Initials length must be 1 or 2: ${initials} (for ${post.author})`);
      assert.strictEqual(initials, initials.toUpperCase(), `Initials must be uppercase: ${initials}`);
      assert.ok(gradient.startsWith('from-') && gradient.includes('to-'), `Gradient must be a valid Tailwind gradient: ${gradient}`);
    }
  });
});
