'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { notifyPerson } from '@/lib/notify';
import { authOptions } from '@/lib/auth';
import { getPostBackground, parsePostMetadata, serializePostMetadata, type PostBackgroundId } from '@/lib/post-background';

// Reaction types
export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

function mapPost(post: any, myLikedPostIds: Set<string>, myReactions: Map<string, ReactionType>) {
  let author = 'Unknown';
  let role = 'Resident';
  let isOrg = false;

  if (post.organization) {
    author = post.organization.name;
    role = 'Organization';
    isOrg = true;
  } else if (post.person) {
    author = `${post.person.firstName} ${post.person.lastName}`;
  }

  return {
    id: post.id,
    author,
    role,
    isOrg,
    authorId: isOrg ? post.organizationId : post.personId,
    avatarImg: isOrg ? undefined : post.person?.profile?.avatarUrl,
    time: typeof post.createdAt === 'string' ? new Date(post.createdAt).toISOString() : post.createdAt.toString(),
    category: post.category,
    title: post.title,
    body: post.content,
    image: post.imageUrl,
    videoUrl: post.videoUrl,
    eventDate: post.eventDate ? new Date(post.eventDate).toISOString() : undefined,
    location: post.location,
    price: post.price != null ? Number(post.price) : undefined,
    postBackground: parsePostMetadata(post.postMetadata).background,
    likes: post.likes || 0,
    comments: post.comments || 0,
    shares: post.shareCount || 0,
    viewCount: post.viewCount || 0,
    isLikedByMe: myLikedPostIds.has(post.id),
    myReaction: myReactions.get(post.id) ?? null,
    orgId: post.organizationId,
  };
}

export async function fetchFeed(
  feedType: 'For You' | 'Following',
  topic: string = 'All',
  cursor?: string,   // createdAt timestamp of the last post (for pagination)
  limit = 15
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId;

  let postsClause: any = {};

  if (feedType === 'Following') {
    const follows = await db.orm.public.Follow.where({ personId }).select('organizationId').all();
    const followedOrgIds = follows.map((f: any) => f.organizationId);
    if (followedOrgIds.length === 0) return { posts: [], nextCursor: null };
    postsClause.organizationId = { in: followedOrgIds };
  }

  if (topic !== 'All') {
    if (topic === 'Marketplace') {
      postsClause.category = { in: ['Offer', 'Marketplace'] };
    } else {
      postsClause.category = topic;
    }
  }

  // Cursor-based pagination using createdAt
  if (cursor) {
    postsClause.createdAt = { lt: new Date(cursor) };
  }

  const rawPosts = await db.orm.public.Post.where(postsClause)
    .orderBy((p: any) => p.createdAt.desc())
    .limit(limit)
    .include('person', (p: any) => p.select('firstName', 'lastName', 'id').include('profile', (prof: any) => prof.select('avatarUrl')))
    .include('organization', (o: any) => o.select('name', 'id'))
    .include('likes', (likes: any) => likes.count())
    .include('comments', (comments: any) => comments.count())
    .all();

  const myLikes = await db.orm.public.PostLike.where({ personId }).select('postId').all();
  const myLikedPostIds = new Set(myLikes.map((l: any) => l.postId));

  // Fetch reactions
  const postIds = rawPosts.map((p: any) => p.id);
  let myReactions = new Map<string, ReactionType>();
  if (postIds.length > 0) {
    try {
      const reactions = await (db.orm.public as any).PostReaction
        ?.where({ personId, postId: { in: postIds } })
        ?.select('postId', 'type')
        ?.all();
      reactions?.forEach((r: any) => myReactions.set(r.postId, r.type as ReactionType));
    } catch {
      // PostReaction model may not exist yet — graceful fallback
    }
  }

  const posts = rawPosts.map((post: any) => mapPost(post, myLikedPostIds, myReactions));
  const nextCursor = rawPosts.length === limit
    ? rawPosts[rawPosts.length - 1].createdAt instanceof Date
      ? rawPosts[rawPosts.length - 1].createdAt.toISOString()
      : new Date(rawPosts[rawPosts.length - 1].createdAt).toISOString()
    : null;

  return { posts, nextCursor };
}

export async function fetchSinglePost(postId: string) {
  const session = await getServerSession(authOptions);
  const personId = session?.user?.personId;

  const post = await db.orm.public.Post.where({ id: postId })
    .include('person', (p: any) => p.select('firstName', 'lastName', 'id').include('profile', (prof: any) => prof.select('avatarUrl')))
    .include('organization', (o: any) => o.select('name', 'id'))
    .include('likes', (likes: any) => likes.count())
    .include('comments', (comments: any) => comments.count())
    .first();

  if (!post) return null;

  const myLikedPostIds = new Set<string>();
  const myReactions = new Map<string, ReactionType>();

  if (personId) {
    const myLike = await db.orm.public.PostLike.where({ personId, postId }).first();
    if (myLike) myLikedPostIds.add(postId);

    try {
      const reaction = await (db.orm.public as any).PostReaction?.where({ personId, postId }).first();
      if (reaction) myReactions.set(postId, reaction.type as ReactionType);
    } catch { /* graceful */ }
  }

  // Increment view count
  try {
    await db.orm.public.Post.where({ id: postId }).update({ viewCount: (post.viewCount || 0) + 1 });
  } catch { /* non-fatal */ }

  return mapPost(post, myLikedPostIds, myReactions);
}

export async function createPost(data: { 
  category: string; 
  title: string; 
  body: string; 
  imageUrl?: string;
  videoUrl?: string;
  eventDate?: string;
  location?: string;
  price?: number;
  postMetadata?: string;
  postBackground?: PostBackgroundId;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId;

  await db.orm.public.Post.create({
    title: data.title,
    content: data.body,
    category: data.category,
    personId: personId,
    status: 'PUBLISHED',
    isEmergency: false,
    imageUrl: data.imageUrl,
    videoUrl: data.videoUrl,
    eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
    location: data.location,
    price: data.price,
    postMetadata: data.postBackground
      ? serializePostMetadata(getPostBackground(data.postBackground).id)
      : data.postMetadata,
  });
}

export async function reactToPost(postId: string, reaction: ReactionType | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  const personId = session.user.personId;

  try {
    const postReactionModel = (db.orm.public as any).PostReaction;
    if (!postReactionModel) {
      await togglePostLike(postId);
      return;
    }

    const existing = await postReactionModel.where({ postId, personId }).first();

    if (reaction === null) {
      // Remove reaction
      if (existing) {
        await postReactionModel.where({ id: existing.id }).delete();
        // Also remove PostLike
        const like = await db.orm.public.PostLike.where({ postId, personId }).first();
        if (like) await db.orm.public.PostLike.where({ id: like.id }).delete();
      }
    } else {
      if (existing) {
        await postReactionModel.where({ id: existing.id }).update({ type: reaction });
      } else {
        await postReactionModel.create({ postId, personId, type: reaction });
        // Ensure PostLike exists too (for the like count)
        const like = await db.orm.public.PostLike.where({ postId, personId }).first();
        if (!like) {
          await db.orm.public.PostLike.create({ postId, personId });
        }
        // Notify post author
        const post = await db.orm.public.Post.where({ id: postId }).first();
        if (post?.personId && post.personId !== personId) {
          await notifyPerson(post.personId, {
            type: 'SYSTEM',
            title: `New reaction on your post`,
            body: `Someone reacted to your post`,
          });
        }
      }
    }
  } catch {
    // PostReaction model doesn't exist yet — fallback to plain like
    await togglePostLike(postId);
  }
}

export async function togglePostLike(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId;

  const existing = await db.orm.public.PostLike.where({ postId, personId }).first();

  if (existing) {
    await db.orm.public.PostLike.where({ id: existing.id }).delete();
  } else {
    await db.orm.public.PostLike.create({
      postId,
      personId,
    });
    const post = await db.orm.public.Post.where({ id: postId }).first();
    if (post?.personId && post.personId !== personId) {
      await notifyPerson(post.personId, {
        type: 'SYSTEM',
        title: 'New Like',
        body: 'Someone liked your post',
      });
    }
  }
}

export async function getFollowedOrganizations() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    return [];
  }

  const follows = await db.orm.public.Follow.where({ personId: session.user.personId }).select('organizationId').all();

  return follows.map((f: any) => f.organizationId);
}

export async function toggleFollow(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId;

  const existing = await db.orm.public.Follow.where({ personId, organizationId }).first();

  if (existing) {
    await db.orm.public.Follow.where({ id: existing.id }).delete();
  } else {
    await db.orm.public.Follow.create({
      personId,
      organizationId,
    });
  }
}
