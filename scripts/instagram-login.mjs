import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.resolve(process.cwd(), '.auth');
const PROFILE_DIR = path.join(AUTH_DIR, 'instagram-profile');
const STATE_FILE = path.join(AUTH_DIR, 'instagram-state.json');

async function main() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  console.log('=============================================================');
  console.log('📸 9jaLive — Instagram Browser Authentication Setup');
  console.log('=============================================================');
  console.log('1. A Chromium browser window will open to Instagram.');
  console.log('2. Log in with your Instagram account (complete any 2FA if prompted).');
  console.log('3. As soon as your login session is detected, it will save');
  console.log('   automatically to .auth/instagram-profile and close.');
  console.log('=============================================================\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 840 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });

  console.log('⏳ Waiting for you to log into Instagram in the browser window...');

  const maxWaitMs = 5 * 60 * 1000; // 5 minutes
  const start = Date.now();
  let loggedIn = false;

  while (Date.now() - start < maxWaitMs) {
    const cookies = await context.cookies('https://www.instagram.com');
    const sessionCookie = cookies.find((c) => c.name === 'sessionid' && c.value && c.value.length > 5);
    if (sessionCookie) {
      loggedIn = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!loggedIn) {
    console.error('❌ Timed out waiting for Instagram login session cookie.');
    await context.close();
    process.exit(1);
  }

  console.log('✅ Login detected! Finalizing session storage (waiting 4s)...');
  await new Promise((r) => setTimeout(r, 4000));
  await context.storageState({ path: STATE_FILE });
  await context.close();

  console.log('\n🎉 Instagram authentication saved to:');
  console.log(`   Profile: ${PROFILE_DIR}`);
  console.log(`   State:   ${STATE_FILE}`);
  console.log('\nYou can now sync Calabar business updates anytime by running:');
  console.log('   npm run social:sync\n');
}

main().catch((err) => {
  console.error('Fatal error in instagram-login:', err);
  process.exit(1);
});
