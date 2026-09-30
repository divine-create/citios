import { db } from './src/prisma/db';
import { getVoiceContext, updateVoiceContext } from './lib/voice/core/context';

async function test() {
  try {
    const personId = '1d805a30-98b9-4471-b033-b899968d9655';
    await updateVoiceContext(personId, { taskState: { status: 'IDLE' } });
    console.log('Update OK');
    const ctx = await getVoiceContext(personId);
    console.log('Get OK:', ctx);
  } catch(e: any) {
    console.error('Crash!', e.stack);
  }
}
test();
