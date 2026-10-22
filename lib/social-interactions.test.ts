import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import {
  getPostDetails,
  addComment,
  toggleLike,
  toggleCommentLike,
} from './actions/post';
import { getCommunityFeed } from './actions/feed';

const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  has: (name: string) => Boolean(mockCookies[name]),
});

async function setupAndSignInAs(person: { id: string; firstName: string; lastName: string }) {
  const email = `social-${person.id.slice(0, 8)}@cityos.test`.toLowerCase();
  
  // Check if identifier already exists
  const existingIdent = await db.orm.public.PersonIdentifier
    .where({ personId: person.id, type: 'EMAIL' })
    .all()
    .first();
  if (!existingIdent) {
    await db.orm.public.PersonIdentifier.create({
      personId: person.id,
      type: 'EMAIL',
      normalizedValue: email,
      isVerified: true,
    });
  }

  // Check if account already exists
  const existingAcct = await db.orm.public.Account
    .where({ personId: person.id })
    .all()
    .first();
  if (!existingAcct) {
    await db.orm.public.Account.create({ personId: person.id, isActive: true });
  }

  const token = await encode({
    token: { email, name: `${person.firstName} ${person.lastName}`, personId: person.id },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });
  const cookieName =
    process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

test('Social Interactions: Post Likes, Comments, Comment Replies & Comment Likes', async (t) => {
  // Setup two residents: author and viewer
  const author = await db.orm.public.Person.create({
    firstName: 'Amara',
    lastName: 'Okoro',
  });
  const viewer = await db.orm.public.Person.create({
    firstName: 'Tunde',
    lastName: 'Bakare',
  });

  await setupAndSignInAs(author);
  await setupAndSignInAs(viewer);

  // Create a post authored by Amara
  const post = await db.orm.public.Post.create({
    title: 'Calabar Carnival Announcements',
    content: 'Full schedule for the upcoming carnival weekend!',
    category: 'Culture',
    personId: author.id,
    status: 'PUBLISHED',
  });

  await t.test('1. toggleLike toggles like state and notifies post author', async () => {
    await setupAndSignInAs(viewer);

    // Initial state: not liked
    const initialDetails = await getPostDetails(post.id);
    assert.equal(initialDetails.hasLiked, false);
    assert.equal(initialDetails.likesCount, 0);

    // Viewer likes the post
    const likeRes = await toggleLike(post.id);
    assert.equal(likeRes.success, true);
    assert.equal(likeRes.liked, true);

    // Verify post details reflect like
    const detailsAfterLike = await getPostDetails(post.id);
    assert.equal(detailsAfterLike.hasLiked, true, 'hasLiked must be true for viewer who liked');
    assert.equal(detailsAfterLike.likesCount, 1);

    // Verify author received POST_LIKE notification
    const notifications = await db.orm.public.Notification.where({
      personId: author.id,
      type: 'POST_LIKE',
    }).all();
    assert.ok(notifications.length > 0, 'Author must receive POST_LIKE notification');
    assert.ok(notifications[0].title.includes('Like'));

    // Viewer unlikes the post
    const unlikeRes = await toggleLike(post.id);
    assert.equal(unlikeRes.success, true);
    assert.equal(unlikeRes.liked, false);

    const detailsAfterUnlike = await getPostDetails(post.id);
    assert.equal(detailsAfterUnlike.hasLiked, false);
    assert.equal(detailsAfterUnlike.likesCount, 0);
  });

  await t.test('2. getCommunityFeed resolves hasLiked accurately for viewers without authored posts', async () => {
    await setupAndSignInAs(viewer);
    // Like the post again
    await toggleLike(post.id);

    const feed = await getCommunityFeed();
    const feedPost = feed.find((p: any) => p.id === post.id);
    assert.ok(feedPost, 'Post must be in community feed');
    assert.equal(feedPost.hasLiked, true, 'Viewer who liked must have hasLiked = true in feed');
    assert.equal(feedPost.likesCount, 1);
  });

  await t.test('3. addComment validates non-empty content and dispatches notification', async () => {
    await setupAndSignInAs(viewer);

    // Reject empty comments
    const emptyRes = await addComment(post.id, '   ');
    assert.equal(emptyRes.error, 'Comment cannot be empty');

    // Add valid top-level comment
    const commentRes = await addComment(post.id, 'Can you share the parade details?');
    assert.equal(commentRes.success, true);

    // Verify comment is returned in post details
    const details = await getPostDetails(post.id);
    assert.equal(details.comments.length, 1);
    assert.equal(details.comments[0].content, 'Can you share the parade details?');
    assert.equal(details.comments[0].user.name, 'Tunde Bakare');

    // Verify author received POST_COMMENT notification
    const commentNotifs = await db.orm.public.Notification.where({
      personId: author.id,
      type: 'POST_COMMENT',
    }).all();
    assert.ok(commentNotifs.length > 0, 'Post author must receive POST_COMMENT notification');
    assert.ok(commentNotifs[0].body?.includes('parade'));
  });

  await t.test('4. addComment with parentId creates threaded reply and notifies parent author', async () => {
    const details = await getPostDetails(post.id);
    const parentComment = details.comments[0];

    // Amara (author) replies to Tunde (viewer)'s comment
    await setupAndSignInAs(author);
    const replyRes = await addComment(post.id, 'Parade starts from Mary Slessor round at 10 AM!', parentComment.id);
    assert.equal(replyRes.success, true);

    // Verify hierarchy in getPostDetails
    const updatedDetails = await getPostDetails(post.id);
    assert.equal(updatedDetails.comments.length, 1, 'Top level comment count stays 1');
    assert.equal(updatedDetails.comments[0].replies.length, 1, 'Parent comment has 1 reply');
    assert.equal(updatedDetails.comments[0].replies[0].content, 'Parade starts from Mary Slessor round at 10 AM!');
    assert.equal(updatedDetails.comments[0].replies[0].user.name, 'Amara Okoro');

    // Verify Tunde (parent author) received notification of the reply
    const replyNotifs = await db.orm.public.Notification.where({
      personId: viewer.id,
      type: 'POST_COMMENT',
    }).all();
    assert.ok(replyNotifs.length > 0, 'Parent comment author must be notified of reply');
    assert.ok(replyNotifs[0].title.includes('Reply'));
  });

  await t.test('5. toggleCommentLike toggles like state on comments and replies and notifies author', async () => {
    const details = await getPostDetails(post.id);
    const rootComment = details.comments[0];
    const replyComment = rootComment.replies[0];

    // Author (Amara) likes Tunde's root comment
    await setupAndSignInAs(author);
    const rootLikeRes = await toggleCommentLike(rootComment.id);
    assert.equal(rootLikeRes.success, true);
    assert.equal(rootLikeRes.liked, true);

    // Verify root comment has likesCount = 1 and hasLiked = true for Amara
    let postDetails = await getPostDetails(post.id);
    assert.equal(postDetails.comments[0].likesCount, 1);
    assert.equal(postDetails.comments[0].hasLiked, true);

    // Verify Tunde received notification for comment like
    const commentLikeNotifs = await db.orm.public.Notification.where({
      personId: viewer.id,
      type: 'POST_LIKE',
    }).all();
    assert.ok(commentLikeNotifs.length > 0, 'Comment author must be notified of comment like');

    // Tunde (viewer) likes Amara's reply comment
    await setupAndSignInAs(viewer);
    const replyLikeRes = await toggleCommentLike(replyComment.id);
    assert.equal(replyLikeRes.success, true);
    assert.equal(replyLikeRes.liked, true);
    assert.equal(replyLikeRes.likesCount, 1);

    postDetails = await getPostDetails(post.id);
    assert.equal(postDetails.comments[0].replies[0].likesCount, 1);
    assert.equal(postDetails.comments[0].replies[0].hasLiked, true);

    // Unlike reply comment
    const unlikeReplyRes = await toggleCommentLike(replyComment.id);
    assert.equal(unlikeReplyRes.success, true);
    assert.equal(unlikeReplyRes.liked, false);
    assert.equal(unlikeReplyRes.likesCount, 0);

    postDetails = await getPostDetails(post.id);
    assert.equal(postDetails.comments[0].replies[0].likesCount, 0);
    assert.equal(postDetails.comments[0].replies[0].hasLiked, false);
  });

  await t.test('6. social actions succeed for residents with no Account record (pure Person session)', async () => {
    // Create a resident with NO Account row and NO email PersonIdentifier
    const residentWithoutAccount = await db.orm.public.Person.create({
      firstName: 'Emeka',
      lastName: 'Nnamdi',
    });

    // Mock session token with personId only (no email, no account)
    const token = await encode({
      token: { personId: residentWithoutAccount.id, name: 'Emeka Nnamdi' },
      secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
    });
    const cookieName =
      process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
    mockCookies[cookieName] = token;

    const details = await getPostDetails(post.id);
    const replyComment = details.comments[0].replies[0];

    // Liking reply comment must succeed
    const likeReply = await toggleCommentLike(replyComment.id);
    assert.equal(likeReply.success, true, 'Liking reply must succeed even without an Account record');
    assert.equal(likeReply.liked, true);
    assert.equal(likeReply.likesCount, 1);

    // Verify reply notification was created with title 'New Like on Your Reply'
    const replyNotifs = await db.orm.public.Notification.where({
      personId: author.id,
      type: 'POST_LIKE',
    }).all();
    const latestNotif = replyNotifs[replyNotifs.length - 1];
    assert.ok(latestNotif.title.includes('Reply'), `Expected notification title to mention Reply, got "${latestNotif.title}"`);

    // Adding a reply comment must succeed
    const addReplyRes = await addComment(post.id, 'Count me in for carnival!', details.comments[0].id);
    assert.equal(addReplyRes.success, true, 'Adding reply must succeed even without an Account record');

    // Clean unliking
    const unlikeReply = await toggleCommentLike(replyComment.id);
    assert.equal(unlikeReply.success, true);
    assert.equal(unlikeReply.liked, false);
    assert.equal(unlikeReply.likesCount, 0);
  });

  await t.test('7. candidatePersonId resolves session.user.id fallback and chronological ordering of replies', async () => {
    // Resident with token having `id` instead of `personId` (standard NextAuth default)
    const token = await encode({
      token: { id: viewer.id, name: 'Tunde Bakare' },
      secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
    });
    const cookieName =
      process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
    mockCookies[cookieName] = token;

    const details = await getPostDetails(post.id);
    const replyComment = details.comments[0].replies[0];

    const likeRes = await toggleCommentLike(replyComment.id);
    assert.equal(likeRes.success, true);
    assert.equal(likeRes.liked, true);
    assert.equal(likeRes.likesCount, 1);

    const updatedDetails = await getPostDetails(post.id);
    assert.equal(updatedDetails.comments[0].replies[0].hasLiked, true);
    assert.equal(updatedDetails.comments[0].replies[0].likesCount, 1);

    // Unliking restores state
    const unlikeRes = await toggleCommentLike(replyComment.id);
    assert.equal(unlikeRes.success, true);
    assert.equal(unlikeRes.liked, false);
    assert.equal(unlikeRes.likesCount, 0);
  });
});
