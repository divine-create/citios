import 'dotenv/config';
import pg from 'pg';
import { 
  parseEventDescription, 
  serializeEventDescription, 
  EVENT_CATEGORIES, 
  type EventCategory 
} from '../lib/event-utils.js';

const { Pool } = pg;

function inferCategory(title: string, desc: string): EventCategory {
  const text = `${title} ${desc}`.toLowerCase();

  if (text.includes('tech') || text.includes('hackathon') || text.includes('pitch') || text.includes('startup') || text.includes('code') || text.includes('developer') || text.includes('business') || text.includes('summit')) {
    return 'Tech & Business';
  }
  if (text.includes('food') || text.includes('dining') || text.includes('culinary') || text.includes('bbq') || text.includes('feast') || text.includes('taste') || text.includes('brunch')) {
    return 'Food & Dining';
  }
  if (text.includes('music') || text.includes('concert') || text.includes('band') || text.includes('live') || text.includes('afrobeats') || text.includes('sound') || text.includes('acoustic')) {
    return 'Live Music & Concerts';
  }
  if (text.includes('party') || text.includes('nightlife') || text.includes('club') || text.includes('dj') || text.includes('rave') || text.includes('afterparty')) {
    return 'Nightlife & Parties';
  }
  if (text.includes('fitness') || text.includes('run') || text.includes('marathon') || text.includes('sports') || text.includes('football') || text.includes('yoga') || text.includes('cycling')) {
    return 'Sports & Fitness';
  }
  if (text.includes('workshop') || text.includes('masterclass') || text.includes('learn') || text.includes('bootcamp') || text.includes('training') || text.includes('seminar')) {
    return 'Workshops & Learning';
  }
  return 'Community & Culture';
}

async function run() {
  console.log('--- Backfilling Event Categories ---');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const res = await client.query('SELECT id, title, description FROM "event"');
    console.log(`Found ${res.rows.length} events in database.`);

    let updatedCount = 0;
    for (const event of res.rows) {
      const parsed = parseEventDescription(event.description);
      const hasExplicit = event.description && event.description.includes('EVENT_CATEGORY:');
      const assignedCategory = hasExplicit ? parsed.category : inferCategory(event.title, parsed.summary);

      const newDescription = serializeEventDescription({
        summary: parsed.summary,
        category: assignedCategory,
        hostPersonId: parsed.hostPersonId,
        hostName: parsed.hostName,
        imageUrl: parsed.imageUrl,
        eventUrl: parsed.eventUrl,
        settings: parsed.settings,
      });

      await client.query('UPDATE "event" SET description = $1 WHERE id = $2', [newDescription, event.id]);
      updatedCount++;
      console.log(`[UPDATED] "${event.title}" -> ${assignedCategory}`);
    }

    console.log(`\nSuccessfully categorized ${updatedCount} events!`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
