import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  try {
    const keepId = 'software-guru-tech-calabar';

    const existingRes = await client.query(
      `SELECT id, name, type, address FROM "organization" WHERE type = 'RETAIL'`
    );
    console.log('Current RETAIL organizations in DB:', existingRes.rows);

    const otherOrgIds = existingRes.rows
      .filter((r) => r.id !== keepId)
      .map((r) => r.id);

    if (otherOrgIds.length === 0) {
      console.log('No other RETAIL organizations found. Only Software Guru Technology exists.');
      return;
    }

    console.log('Removing', otherOrgIds.length, 'other RETAIL organizations:', otherOrgIds);

    await client.query('BEGIN');

    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS ref_table,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    const tablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tables = new Set(tablesRes.rows.map((r) => r.table_name));

    if (tables.has('retailOrder')) {
      const ordersRes = await client.query(
        `SELECT id FROM "retailOrder" WHERE "organizationId" = ANY($1::text[])`,
        [otherOrgIds]
      );
      const orderIds = ordersRes.rows.map((r) => r.id);
      if (orderIds.length > 0) {
        if (tables.has('retailOrderItem')) {
          await client.query(
            `DELETE FROM "retailOrderItem" WHERE "orderId" = ANY($1::text[])`,
            [orderIds]
          );
        }
        if (tables.has('payment')) {
          await client.query(
            `DELETE FROM "payment" WHERE "retailOrderId" = ANY($1::text[])`,
            [orderIds]
          );
        }
        await client.query(
          `DELETE FROM "retailOrder" WHERE id = ANY($1::text[])`,
          [orderIds]
        );
      }
    }

    if (tables.has('wallet')) {
      const walletsRes = await client.query(
        `SELECT id FROM "wallet" WHERE "organizationId" = ANY($1::text[])`,
        [otherOrgIds]
      );
      const walletIds = walletsRes.rows.map((r) => r.id);
      if (walletIds.length > 0) {
        if (tables.has('ledgerEntry')) {
          await client.query(
            `DELETE FROM "ledgerEntry" WHERE "walletId" = ANY($1::text[])`,
            [walletIds]
          );
        }
        await client.query(
          `DELETE FROM "wallet" WHERE id = ANY($1::text[])`,
          [walletIds]
        );
      }
    }

    if (tables.has('relationship') && tables.has('customerData')) {
      const custRes = await client.query(
        `SELECT id FROM "customerData" WHERE "relationshipId" IN (
          SELECT id FROM "relationship" WHERE "organizationId" = ANY($1::text[])
        )`,
        [otherOrgIds]
      );
      const custIds = custRes.rows.map((r) => r.id);
      if (custIds.length > 0) {
        if (tables.has('retailOrder')) {
          await client.query(
            `UPDATE "retailOrder" SET "customerDataId" = NULL WHERE "customerDataId" = ANY($1::text[])`,
            [custIds]
          );
        }
        await client.query(
          `DELETE FROM "customerData" WHERE id = ANY($1::text[])`,
          [custIds]
        );
      }
    }

    for (const fk of fkRes.rows) {
      if (fk.ref_table === 'organization' && fk.delete_rule !== 'CASCADE') {
        console.log(`Cleaning non-cascade FK: "${fk.table_name}"."${fk.column_name}" (${fk.delete_rule})`);
        await client.query(
          `DELETE FROM "${fk.table_name}" WHERE "${fk.column_name}" = ANY($1::text[])`,
          [otherOrgIds]
        );
      }
    }

    if (tables.has('discoveryListing')) {
      await client.query(
        `DELETE FROM "discoveryListing" WHERE vertical = 'RETAIL' AND "organizationId" != $1`,
        [keepId]
      );
    }
    if (tables.has('retailProduct')) {
      await client.query(
        `DELETE FROM "retailProduct" WHERE "organizationId" != $1`,
        [keepId]
      );
    }

    const delRes = await client.query(
      `DELETE FROM "organization" WHERE type = 'RETAIL' AND id != $1 RETURNING id, name`,
      [keepId]
    );
    console.log('Deleted RETAIL organizations:', delRes.rows);

    await client.query('COMMIT');

    const remainingOrgs = await client.query(
      `SELECT id, name, type, address FROM "organization" WHERE type = 'RETAIL'`
    );
    const remainingProducts = await client.query(
      `SELECT COUNT(*)::int AS count FROM "retailProduct"`
    );
    console.log('Remaining RETAIL organizations:', remainingOrgs.rows);
    console.log('Remaining retailProduct count:', remainingProducts.rows[0].count);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error removing other shops:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
