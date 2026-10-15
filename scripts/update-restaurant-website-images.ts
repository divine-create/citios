import 'dotenv/config';
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('=== UPDATING RESTAURANTS WITH AUTHENTIC WEBSITE IMAGES ===\n');
    await client.query('BEGIN');

    // 1. Crunchies Fried Chicken (Marian)
    // Website: https://www.crunchiesonline.com
    const crunchiesOrg = (await client.query(`SELECT id FROM "organization" WHERE name = 'Crunchies Fried Chicken (Marian)'`)).rows[0];
    if (crunchiesOrg) {
      const crunchiesId = crunchiesOrg.id;
      const crunchiesCover = 'https://www.crunchiesonline.com/images/Protein.jpg';
      const crunchiesLogo = 'https://www.crunchiesonline.com/_next/static/media/logo-red.f7220377.png';
      const crunchiesImages = [
        'https://www.crunchiesonline.com/images/Protein.jpg',
        'https://www.crunchiesonline.com/images/food.jpg',
        'https://www.crunchiesonline.com/images/Pastries.webp',
        'https://www.crunchiesonline.com/images/Sharwarma.jpg',
        'https://www.crunchiesonline.com/images/Bread1.jpg',
        'https://chopcalabar.com/assets/images/place_6977791670ac71.47884406.webp'
      ];

      await client.query(`UPDATE "organization" SET "logoAssetId" = $1 WHERE id = $2`, [crunchiesCover, crunchiesId]);
      
      const listing = (await client.query(`SELECT id, metadata FROM "discoveryListing" WHERE "organizationId" = $1`, [crunchiesId])).rows[0];
      if (listing) {
        const meta = JSON.parse(listing.metadata || '{}');
        meta.coverImage = crunchiesCover;
        meta.images = crunchiesImages;
        await client.query(`UPDATE "discoveryListing" SET "coverAssetId" = $1, metadata = $2 WHERE id = $3`, [
          crunchiesCover,
          JSON.stringify(meta),
          listing.id
        ]);
      }

      // Update Menu items with website images
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Combo%'`, ['https://www.crunchiesonline.com/images/Protein.jpg', crunchiesId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND (name LIKE '%Jollof%' OR name LIKE '%Fried Rice%')`, ['https://www.crunchiesonline.com/images/food.jpg', crunchiesId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Pie%'`, ['https://www.crunchiesonline.com/images/Pastries.webp', crunchiesId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Shawarma%'`, ['https://www.crunchiesonline.com/images/Sharwarma.jpg', crunchiesId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Bread%'`, ['https://www.crunchiesonline.com/images/Bread1.jpg', crunchiesId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Chicken%'`, ['https://www.crunchiesonline.com/images/Protein.jpg', crunchiesId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Drink%'`, ['https://crunchiesonline.com/og-image.jpg', crunchiesId]);

      console.log('✓ Updated Crunchies with official website images (crunchiesonline.com)');
    }

    // 2. Chicken Republic (Marian)
    // Website: https://foodconceptsplc.com & https://chicken-republic.com
    const crOrg = (await client.query(`SELECT id FROM "organization" WHERE name = 'Chicken Republic (Marian)'`)).rows[0];
    if (crOrg) {
      const crId = crOrg.id;
      const crCover = 'https://foodconceptsplc.com/wp-content/uploads/2021/06/FCPLC_ChickeRepublic.jpg';
      const crImages = [
        'https://foodconceptsplc.com/wp-content/uploads/2021/06/FCPLC_ChickeRepublic.jpg',
        'https://foodconceptsplc.com/wp-content/uploads/2019/10/FoodConcepts_ChickenRepublicHeader.png',
        'https://foodconceptsplc.com/wp-content/uploads/2021/06/FCPLC_PieXpress.jpg',
        'https://foodconceptsplc.com/wp-content/uploads/2021/06/FCPLC_Chopbox.jpg',
        'https://chopcalabar.com/assets/images/place_6984ff36e07d84.33997134.jpeg'
      ];

      await client.query(`UPDATE "organization" SET "logoAssetId" = $1 WHERE id = $2`, [crCover, crId]);

      const listing = (await client.query(`SELECT id, metadata FROM "discoveryListing" WHERE "organizationId" = $1`, [crId])).rows[0];
      if (listing) {
        const meta = JSON.parse(listing.metadata || '{}');
        meta.coverImage = crCover;
        meta.images = crImages;
        await client.query(`UPDATE "discoveryListing" SET "coverAssetId" = $1, metadata = $2 WHERE id = $3`, [
          crCover,
          JSON.stringify(meta),
          listing.id
        ]);
      }

      // Update Menu items
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND (name LIKE '%Refuel%' OR name LIKE '%Citizens%')`, ['https://foodconceptsplc.com/wp-content/uploads/2021/06/FCPLC_Chopbox.jpg', crId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Rotisserie%'`, ['https://foodconceptsplc.com/wp-content/uploads/2021/06/FCPLC_ChickeRepublic.jpg', crId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Burger%'`, ['https://foodconceptsplc.com/wp-content/uploads/2019/10/FoodConcepts_ChickenRepublicHeader.png', crId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND (name LIKE '%Wings%' OR name LIKE '%Chicken%')`, ['https://foodconceptsplc.com/wp-content/uploads/2021/06/FCPLC_ChickeRepublic.jpg', crId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Plantain%'`, ['https://foodconceptsplc.com/wp-content/uploads/2021/06/FCPLC_PieXpress.jpg', crId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Drink%'`, ['https://foodconceptsplc.com/wp-content/uploads/2019/10/FoodConcepts_ChickenRepublicHeader.png', crId]);

      console.log('✓ Updated Chicken Republic with official brand website assets (foodconceptsplc.com)');
    }

    // 3. Domino's Pizza & Cold Stone (Marian)
    // Website: https://www.dominos.ng & https://coldstonecreamery.ng
    const domOrg = (await client.query(`SELECT id FROM "organization" WHERE name = $1`, ["Domino's Pizza & Cold Stone (Marian)"])).rows[0];
    if (domOrg) {
      const domId = domOrg.id;
      const domCover = 'https://www.dominos.ng/assets/2026.1005.2/assets/build/images/promo/dominos_social_logo.jpg';
      const domImages = [
        'https://www.dominos.ng/assets/2026.1005.2/assets/build/images/promo/dominos_social_logo.jpg',
        'https://coldstonecreamery.ng/social-share-nigeria.webp',
        'https://chopcalabar.com/assets/images/place_6984b9a16e0db2.11861223.jpeg'
      ];

      await client.query(`UPDATE "organization" SET "logoAssetId" = $1 WHERE id = $2`, [domCover, domId]);

      const listing = (await client.query(`SELECT id, metadata FROM "discoveryListing" WHERE "organizationId" = $1`, [domId])).rows[0];
      if (listing) {
        const meta = JSON.parse(listing.metadata || '{}');
        meta.coverImage = domCover;
        meta.images = domImages;
        await client.query(`UPDATE "discoveryListing" SET "coverAssetId" = $1, metadata = $2 WHERE id = $3`, [
          domCover,
          JSON.stringify(meta),
          listing.id
        ]);
      }

      // Update Menu items
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Pizza%'`, ['https://www.dominos.ng/assets/2026.1005.2/assets/build/images/promo/dominos_social_logo.jpg', domId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND (name LIKE '%Bread%' OR name LIKE '%Wings%' OR name LIKE '%Cinnastix%')`, ['https://www.dominos.ng/assets/2026.1005.2/assets/build/images/promo/dominos_social_logo.jpg', domId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Cold Stone%'`, ['https://coldstonecreamery.ng/social-share-nigeria.webp', domId]);
      await client.query(`UPDATE "menuItem" SET "imageUrl" = $1 WHERE "organizationId" = $2 AND name LIKE '%Beverage%'`, ['https://www.dominos.ng/assets/2026.1005.2/assets/build/images/promo/dominos_social_logo.jpg', domId]);

      console.log('✓ Updated Domino\'s & Cold Stone with official brand website assets (dominos.ng & coldstonecreamery.ng)');
    }

    // 4. Native Delicacies Restaurant
    const nativeOrg = (await client.query(`SELECT id FROM "organization" WHERE name = 'Native Delicacies Restaurant'`)).rows[0];
    if (nativeOrg) {
      const nativeId = nativeOrg.id;
      const nativeCover = 'https://chopcalabar.com/assets/images/place_697750c01b0c71.92944701.jpeg';
      const nativeImages = [
        'https://chopcalabar.com/assets/images/place_697750c01b0c71.92944701.jpeg'
      ];

      await client.query(`UPDATE "organization" SET "logoAssetId" = $1 WHERE id = $2`, [nativeCover, nativeId]);

      const listing = (await client.query(`SELECT id, metadata FROM "discoveryListing" WHERE "organizationId" = $1`, [nativeId])).rows[0];
      if (listing) {
        const meta = JSON.parse(listing.metadata || '{}');
        meta.coverImage = nativeCover;
        meta.images = nativeImages;
        await client.query(`UPDATE "discoveryListing" SET "coverAssetId" = $1, metadata = $2 WHERE id = $3`, [
          nativeCover,
          JSON.stringify(meta),
          listing.id
        ]);
      }
      console.log('✓ Updated Native Delicacies Restaurant with authentic verified establishment photography');
    }

    await client.query('COMMIT');
    console.log('\nSUCCESS: All restaurants updated with their authentic website & establishment assets!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
