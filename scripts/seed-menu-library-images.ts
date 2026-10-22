import 'dotenv/config';
import { db } from '../src/prisma/db.js';
import { matchImageForMenuItem } from '../lib/menu-library.js';

async function main() {
  console.log('Running menu library image sync...');
  const items = await db.orm.public.MenuItem.all();
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const isRemoteOrMissing =
      !item.imageUrl ||
      item.imageUrl.includes('unsplash.com') ||
      item.imageUrl.includes('placeholder') ||
      item.imageUrl.trim() === '';

    if (!isRemoteOrMissing) {
      skipped++;
      continue;
    }

    const matchedImage = matchImageForMenuItem(item.name);
    if (matchedImage && matchedImage !== item.imageUrl) {
      await db.orm.public.MenuItem.where({ id: item.id }).update({
        imageUrl: matchedImage,
      });
      console.log(`Updated [${item.name}] -> ${matchedImage}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nSync complete! Updated: ${updated}, Kept/Skipped: ${skipped}, Total: ${items.length}`);
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
