import 'dotenv/config';
import { db } from './src/prisma/db';

async function migrate() {
  console.log("Migrating microsite sections to pages...");
  
  const microsites = await db.orm.public.Microsite.all();
  console.log(`Found ${microsites.length} microsites`);

  for (const microsite of microsites) {
    let pages = await db.orm.public.MicrositePage.where({ micrositeId: microsite.id }).all();
    
    let homePage;
    if (pages.length === 0) {
      console.log(`Creating Home page for microsite ${microsite.id}`);
      homePage = await db.orm.public.MicrositePage.create({
        micrositeId: microsite.id,
        title: 'Home',
        slug: 'home',
        isHome: true,
      });
    } else {
      homePage = pages.find(p => p.isHome) || pages[0];
    }

    const sections = await db.orm.public.MicrositeSection.where({ micrositeId: microsite.id }).all();
    for (const section of sections) {
      if (!section.pageId) {
        console.log(`Linking section ${section.id} to page ${homePage.id}`);
        await db.orm.public.MicrositeSection.where({ id: section.id }).update({
          pageId: homePage.id
        });
      }
    }
  }

  console.log("Migration complete!");
}

migrate().catch(console.error).finally(() => db.close());
