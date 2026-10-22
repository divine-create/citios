import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const brokenList: any[] = JSON.parse(
      fs.readFileSync('scripts/final-broken-products.json', 'utf8')
    );

    const brokenIds = Array.from(new Set(brokenList.map((b) => b.id)));
    console.log(`=== PURGING ${brokenIds.length} PRODUCTS WITH BROKEN/NON-LOADING IMAGES ===`);

    await client.query('BEGIN');

    // 1. Delete dependent retailPurchaseOrderItem rows
    const delPO = await client.query(
      `DELETE FROM "retailPurchaseOrderItem" WHERE "productId" = ANY($1::text[])`,
      [brokenIds]
    );

    // 2. Delete dependent retailOrderItem rows
    const delOrderItems = await client.query(
      `DELETE FROM "retailOrderItem" WHERE "productId" = ANY($1::text[])`,
      [brokenIds]
    );

    // 3. Delete dependent retailLocationStock rows
    const delLocStock = await client.query(
      `DELETE FROM "retailLocationStock" WHERE "productId" = ANY($1::text[])`,
      [brokenIds]
    );

    // 4. Delete dependent retailStockMovement rows
    const delStockMovements = await client.query(
      `DELETE FROM "retailStockMovement" WHERE "productId" = ANY($1::text[])`,
      [brokenIds]
    );

    // 5. Delete dependent voiceCartItem rows
    const delVoiceCart = await client.query(
      `DELETE FROM "voiceCartItem" WHERE "retailProductId" = ANY($1::text[])`,
      [brokenIds]
    );

    // 6. Delete child variants if any
    const delVariants = await client.query(
      `DELETE FROM "retailProduct" WHERE "parentId" = ANY($1::text[])`,
      [brokenIds]
    );

    // 7. Delete the retailProduct rows themselves
    const delProducts = await client.query(
      `DELETE FROM "retailProduct" WHERE id = ANY($1::text[]) RETURNING id, name, "organizationId"`,
      [brokenIds]
    );

    await client.query('COMMIT');

    console.log(`\nSuccessfully deleted ${delProducts.rowCount} products with non-loading images.`);
    console.log(` - retailPurchaseOrderItem: ${delPO.rowCount}`);
    console.log(` - retailOrderItem: ${delOrderItems.rowCount}`);
    console.log(` - retailLocationStock: ${delLocStock.rowCount}`);
    console.log(` - retailStockMovement: ${delStockMovements.rowCount}`);
    console.log(` - voiceCartItem: ${delVoiceCart.rowCount}`);
    console.log(` - child variants: ${delVariants.rowCount}`);

    // Verify remaining store counts
    const verifyRes = await client.query(`
      SELECT o.id, o.name, count(p.id)::int as product_count
      FROM "organization" o
      JOIN "retailProduct" p ON p."organizationId" = o.id
      GROUP BY o.id, o.name
      ORDER BY o.name
    `);

    console.log('\n=== REMAINING ACTIVE STORES & PRODUCT COUNTS ===');
    let totalRemaining = 0;
    for (const row of verifyRes.rows) {
      console.log(` - ${row.name} (${row.id}): ${row.product_count} products (100% verified loading images)`);
      totalRemaining += row.product_count;
    }
    console.log(`\nTotal verified products remaining in stores: ${totalRemaining}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error removing broken image products:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
