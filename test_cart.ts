import { getVoiceCart } from './lib/voice/cart';

async function main() {
  try {
    const data = await getVoiceCart('some-id');
    console.log("SUCCESS:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("ERROR:", e.message, "\nSTACK:", e.stack);
  }
}
main();
