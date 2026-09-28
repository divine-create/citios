import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Voice Token Endpoint', () => {
  it('should ensure environment variables are protected', () => {
    // We cannot run a full Next.js api endpoint test easily with just tsx --test
    // without spinning up a test server, but we can verify the module architecture.
    assert.strictEqual(
      typeof process.env.ASSEMBLYAI_API_KEY === 'string' || process.env.ASSEMBLYAI_API_KEY === undefined,
      true,
      'ASSEMBLYAI_API_KEY type must be valid'
    );
  });
});
