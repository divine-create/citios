import { db } from '../src/prisma/db';
import { isTestOrDemoOrganization } from '../lib/storefront-filter';

async function main() {
  console.log('--- PURGE NEWSFEED DEMO POSTS STARTED ---');

  // Fetch all posts with org and author info
  const posts = await db.orm.public.Post
    .include('organization')
    .include('person', (p: any) => p.include('identifiers'))
    .all();

  console.log(`Total posts currently in DB: ${posts.length}`);

  const targetPosts: any[] = [];
  const authenticPosts: any[] = [];

  for (const p of posts) {
    const title = (p.title || '').trim();
    const isDiag = title === 'Diag Post';
    const isTestOrg = Boolean(
      p.organizationId &&
      (p.organizationId.startsWith('org_service_a_') ||
       isTestOrDemoOrganization({ id: p.organizationId, name: p.organization?.name }))
    );

    const email = p.person?.identifiers?.find((i: any) => i.type === 'EMAIL')?.normalizedValue || '';
    const isTestCarnival =
      title === 'Calabar Carnival Announcements' &&
      (email.includes('@cityos.test') ||
       email.includes('@example.com') ||
       p.person?.firstName === 'Amara' ||
       !email);

    if (isDiag || isTestOrg || isTestCarnival) {
      targetPosts.push(p);
    } else {
      authenticPosts.push(p);
    }
  }

  console.log(`Identified ${targetPosts.length} demo/test posts to purge.`);
  console.log(`Preserving ${authenticPosts.length} authentic resident and merchant posts.`);

  if (targetPosts.length === 0) {
    console.log('No demo posts found. Nothing to purge.');
    return;
  }

  console.log('\nTarget Posts to delete:');
  for (const tp of targetPosts) {
    const email = tp.person?.identifiers?.find((i: any) => i.type === 'EMAIL')?.normalizedValue || 'N/A';
    console.log(`- [${tp.id}] "${tp.title}" (Org: ${tp.organization?.name || 'None'}, Author: ${tp.person?.firstName || 'None'}, Email: ${email})`);
  }

  const targetPostIds = targetPosts.map(p => p.id);

  // 1. Fetch dependent comments
  const comments = await db.orm.public.Comment
    .where((c: any) => c.postId.in(targetPostIds))
    .all();
  const commentIds = comments.map((c: any) => c.id);
  console.log(`\nFound ${comments.length} dependent comments to remove.`);

  // 2. Delete CommentLikes on those comments
  if (commentIds.length > 0) {
    const cl = await db.orm.public.CommentLike
      .where((cl: any) => cl.commentId.in(commentIds))
      .all();
    console.log(`Found ${cl.length} dependent comment likes to remove.`);
    for (const item of cl) {
      await db.orm.public.CommentLike.where({ id: item.id }).delete();
    }
  }

  // 3. Delete Comment replies first (parentId != null)
  const replies = comments.filter((c: any) => Boolean(c.parentId));
  console.log(`Deleting ${replies.length} comment replies...`);
  for (const r of replies) {
    await db.orm.public.Comment.where({ id: r.id }).delete();
  }

  // 4. Delete root Comments (parentId == null)
  const rootComments = comments.filter((c: any) => !c.parentId);
  console.log(`Deleting ${rootComments.length} root comments...`);
  for (const rc of rootComments) {
    await db.orm.public.Comment.where({ id: rc.id }).delete();
  }

  // 5. Delete PostLikes
  const postLikes = await db.orm.public.PostLike
    .where((pl: any) => pl.postId.in(targetPostIds))
    .all();
  console.log(`Deleting ${postLikes.length} post likes...`);
  for (const pl of postLikes) {
    await db.orm.public.PostLike.where({ id: pl.id }).delete();
  }

  // 6. Delete PostReactions if table exists
  try {
    const postReactions = await (db.orm.public as any).PostReaction
      ?.where((pr: any) => pr.postId.in(targetPostIds))
      ?.all();
    if (postReactions && postReactions.length > 0) {
      console.log(`Deleting ${postReactions.length} post reactions...`);
      for (const pr of postReactions) {
        await (db.orm.public as any).PostReaction.where({ id: pr.id }).delete();
      }
    }
  } catch {
    // PostReaction table might not exist
  }

  // 7. Delete target Posts
  console.log(`Deleting ${targetPostIds.length} target posts...`);
  for (const postId of targetPostIds) {
    await db.orm.public.Post.where({ id: postId }).delete();
  }

  // 8. Delete test orgs (org_service_a_*)
  const testOrgIds = Array.from(new Set(
    targetPosts
      .map(p => p.organizationId)
      .filter((orgId): orgId is string => Boolean(orgId && orgId.startsWith('org_service_a_')))
  ));
  if (testOrgIds.length > 0) {
    console.log(`\nCleaning up ${testOrgIds.length} test service organizations...`);
    for (const orgId of testOrgIds) {
      try {
        await db.orm.public.Organization.where({ id: orgId }).delete();
      } catch (err: any) {
        console.warn(`Could not delete test org ${orgId}:`, err.message);
      }
    }
  }

  // 9. Delete test persons (Amara Okoro test accounts, DiagA Author)
  const testPersonIds = Array.from(new Set(
    targetPosts
      .map(p => p.personId)
      .filter((personId): personId is string => Boolean(personId))
  ));
  console.log(`\nCleaning up ${testPersonIds.length} test author accounts...`);
  for (const personId of testPersonIds) {
    try {
      await db.orm.public.Person.where({ id: personId }).delete();
    } catch (err: any) {
      console.warn(`Could not delete test person ${personId}:`, err.message);
    }
  }

  // Verification
  const remainingPosts = await db.orm.public.Post.all();
  console.log(`\n--- PURGE COMPLETED SUCCESSFULLY ---`);
  console.log(`Initial total posts: ${posts.length}`);
  console.log(`Purged demo posts: ${targetPosts.length}`);
  console.log(`Remaining posts: ${remainingPosts.length}`);
}

main().catch(console.error).finally(() => process.exit(0));
