import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

async function purgeNewsfeedPosts() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const targets: { id: string; title: string; reason: string }[] = JSON.parse(
      fs.readFileSync('scripts/target-newsfeed-removals.json', 'utf8')
    );

    const postIds = Array.from(new Set(targets.map(t => t.id)));
    console.log(`=== PURGING ${postIds.length} BROKEN IMAGE PRODUCT POSTS FROM NEWSFEED ===`);

    await client.query('BEGIN');

    // 1. Find all comments on these posts
    const commentsRes = await client.query(
      `SELECT id FROM "comment" WHERE "postId" = ANY($1::text[])`,
      [postIds]
    );
    const commentIds = commentsRes.rows.map((r: any) => r.id);

    // 2. Delete CommentLike if any
    let delCommentLikesCount = 0;
    if (commentIds.length > 0) {
      const delCL = await client.query(
        `DELETE FROM "commentLike" WHERE "commentId" = ANY($1::text[])`,
        [commentIds]
      );
      delCommentLikesCount = delCL.rowCount || 0;
    }

    // 3. Delete Comment replies first (child comments)
    let delRepliesCount = 0;
    if (commentIds.length > 0) {
      const delReplies = await client.query(
        `DELETE FROM "comment" WHERE "parentId" IS NOT NULL AND "postId" = ANY($1::text[])`,
        [postIds]
      );
      delRepliesCount = delReplies.rowCount || 0;
    }

    // 4. Delete remaining top-level comments
    const delComments = await client.query(
      `DELETE FROM "comment" WHERE "postId" = ANY($1::text[])`,
      [postIds]
    );

    // 5. Delete PostLike
    const delLikes = await client.query(
      `DELETE FROM "postLike" WHERE "postId" = ANY($1::text[])`,
      [postIds]
    );

    // 6. Delete Post
    const delPosts = await client.query(
      `DELETE FROM "post" WHERE id = ANY($1::text[]) RETURNING id, title`,
      [postIds]
    );

    await client.query('COMMIT');

    console.log(`\nSuccessfully purged ${delPosts.rowCount} posts from newsfeed.`);
    console.log(` - commentLikes removed: ${delCommentLikesCount}`);
    console.log(` - comments (replies) removed: ${delRepliesCount}`);
    console.log(` - comments (top-level) removed: ${delComments.rowCount}`);
    console.log(` - postLikes removed: ${delLikes.rowCount}`);

    // Verify remaining posts in newsfeed
    const remainingRes = await client.query(`
      SELECT "linkedEntityType", count(*)::int as count
      FROM "post"
      GROUP BY "linkedEntityType"
      ORDER BY count DESC
    `);
    console.log('\n=== REMAINING POSTS IN NEWSFEED BY TYPE ===');
    let totalRemaining = 0;
    for (const row of remainingRes.rows) {
      console.log(` - ${row.linkedEntityType || 'USER_POST'}: ${row.count}`);
      totalRemaining += row.count;
    }
    console.log(`Total remaining posts: ${totalRemaining}`);

    // Verify that NO orphaned retail posts exist
    const orphanedCheck = await client.query(`
      SELECT p.id, p.title, p."linkedEntityId"
      FROM "post" p
      LEFT JOIN "retailProduct" rp ON p."linkedEntityId" = rp.id
      WHERE p."linkedEntityType" = 'RETAIL_PRODUCT' AND rp.id IS NULL
    `);
    console.log(`\nOrphaned retail product posts remaining: ${orphanedCheck.rows.length}`);

    // Verify that NO null/empty image retail posts exist
    const emptyCheck = await client.query(`
      SELECT p.id, p.title
      FROM "post" p
      WHERE p."linkedEntityType" = 'RETAIL_PRODUCT'
        AND (p."imageUrl" IS NULL OR trim(p."imageUrl") = '')
    `);
    console.log(`Null/empty image retail posts remaining: ${emptyCheck.rows.length}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to purge posts:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

purgeNewsfeedPosts().catch(console.error);
