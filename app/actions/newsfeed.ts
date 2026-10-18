'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { notifyPerson } from '@/lib/notify';
import { authOptions } from '@/lib/auth';
import { getPostBackground, parsePostMetadata, serializePostMetadata, type PostBackgroundId } from '@/lib/post-background';

// Reaction types
export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

function toTemporal(date: Date = new Date()) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function mapPost(post: any, myLikedPostIds: Set<string>, myReactions: Map<string, ReactionType>, currentPersonId?: string, myOrgIds?: Set<string>) {
  let parsedRawMeta: any = null;
  if (post.postMetadata) {
    try {
      parsedRawMeta = JSON.parse(post.postMetadata);
    } catch {
      parsedRawMeta = null;
    }
  }

  const isReviewPost =
    post.category === 'Review' ||
    post.linkedEntityType === 'REVIEW' ||
    Boolean(parsedRawMeta?.isReviewCard);

  let author = 'Unknown';
  let role = 'Resident';
  let isOrg = false;

  if (isReviewPost && post.person) {
    author = `${post.person.firstName} ${post.person.lastName}`.trim();
    role = 'Local Reviewer';
    isOrg = false;
  } else if (post.organization && !isReviewPost) {
    author = post.organization.name;
    role = post.organization.type ? `${post.organization.type.charAt(0)}${post.organization.type.slice(1).toLowerCase()}` : 'Organization';
    isOrg = true;
  } else if (post.person) {
    author = `${post.person.firstName} ${post.person.lastName}`.trim();
  }

  const isMyPost = Boolean(
    currentPersonId &&
      (post.personId === currentPersonId || (!isReviewPost && post.organizationId && myOrgIds?.has(post.organizationId)))
  );

  const reviewCard = isReviewPost
    ? {
        reviewId: parsedRawMeta?.reviewId || post.linkedEntityId || post.id,
        rating: Number(parsedRawMeta?.rating) || 5,
        photos: Array.isArray(parsedRawMeta?.photos)
          ? parsedRawMeta.photos
          : post.imageUrl
          ? [post.imageUrl]
          : [],
        tags: Array.isArray(parsedRawMeta?.tags) ? parsedRawMeta.tags : [],
        isVerifiedCustomer: Boolean(parsedRawMeta?.isVerifiedCustomer),
        reviewedOrgId: parsedRawMeta?.reviewedOrgId || post.organizationId || '',
        reviewedOrgName:
          parsedRawMeta?.reviewedOrgName || post.organization?.name || 'Local Business',
        reviewedOrgCategory: parsedRawMeta?.reviewedOrgCategory || 'Business',
        reviewedOrgAddress: parsedRawMeta?.reviewedOrgAddress || post.location || 'Calabar',
        reviewedOrgCover: parsedRawMeta?.reviewedOrgCover || null,
      }
    : undefined;

  let href: { url: string; label: string } | undefined = undefined;

  if (post.linkedEntityType === 'MENU_ITEM' && post.linkedEntityId) {
    href = { url: `/food/item/${post.linkedEntityId}`, label: 'Order Dish →' };
  } else if (post.linkedEntityType === 'RETAIL_PRODUCT' && post.linkedEntityId) {
    href = { url: `/product/${post.linkedEntityId}`, label: 'View Product →' };
  } else if (post.linkedEntityType === 'SERVICE' && post.linkedEntityId) {
    href = { url: `/service/${post.linkedEntityId}`, label: 'Book Service →' };
  } else if (post.linkedEntityType === 'EVENT') {
    href = { url: post.linkedEntityId ? `/events/${post.linkedEntityId}` : '/events', label: 'View Event & RSVP →' };
  } else if (post.linkedEntityType === 'JOB') {
    href = { url: post.linkedEntityId ? `/jobs/${post.linkedEntityId}` : '/jobs', label: 'View Job Opening →' };
  } else if (post.linkedEntityType === 'HOTEL' && (post.linkedEntityId || post.organizationId)) {
    href = { url: `/org/${post.linkedEntityId || post.organizationId}`, label: 'Book Stay →' };
  } else if (parsedRawMeta?.href) {
    href = parsedRawMeta.href;
  } else if (isOrg && post.organizationId) {
    href = { url: `/org/${post.organizationId}`, label: 'Visit Storefront →' };
  }

  return {
    id: post.id,
    author,
    role,
    isOrg,
    authorId: isOrg ? post.organizationId : post.personId,
    avatarImg: isOrg ? undefined : post.person?.profile?.avatarUrl,
    time: post.createdAt ? String(post.createdAt) : new Date().toISOString(),
    category: post.category,
    title: post.title,
    body: post.content,
    image: post.imageUrl,
    videoUrl: post.videoUrl,
    eventDate: post.eventDate ? String(post.eventDate) : undefined,
    location: post.location,
    price: post.price != null ? Number(post.price) : undefined,
    postBackground: isReviewPost ? 'auto' : parsePostMetadata(post.postMetadata).background,
    likes: post.likes || 0,
    comments: post.comments || 0,
    shares: post.shareCount || 0,
    viewCount: post.viewCount || 0,
    isLikedByMe: myLikedPostIds.has(post.id),
    myReaction: myReactions.get(post.id) ?? null,
    isMyPost,
    orgId: post.organizationId,
    href,
    reviewCard,
  };
}

export async function fetchFeed(
  feedType: 'For You' | 'Following',
  topic: string = 'All',
  cursor?: string,   // createdAt timestamp of the last post (for pagination)
  limit = 15
) {
  let personId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    personId = session?.user?.personId;
  } catch {
    personId = undefined;
  }

  let query: any = db.orm.public.Post;

  if (feedType === 'Following') {
    if (!personId) return { posts: [], nextCursor: null };
    const follows = await db.orm.public.Follow.where({ personId }).select('organizationId').all();
    const followedOrgIds = follows.map((f: any) => f.organizationId);
    if (followedOrgIds.length === 0) return { posts: [], nextCursor: null };
    query = query.where((p: any) => p.organizationId.in(followedOrgIds));
  }

  if (topic !== 'All') {
    if (topic === 'Marketplace') {
      query = query.where((p: any) => p.category.in(['Offer', 'Marketplace', 'RETAIL', 'Shops']));
    } else if (topic === 'Reviews') {
      query = query.where({ category: 'Review' });
    } else if (topic === 'Food') {
      query = query.where((p: any) => p.category.in(['Food', 'Restaurant', 'FOOD']));
    } else if (topic === 'Events') {
      query = query.where((p: any) => p.category.in(['Events', 'Event', 'EVENT']));
    } else if (topic === 'Stays') {
      query = query.where((p: any) => p.category.in(['Stays', 'Housing', 'Hotel', 'STAY']));
    } else if (topic === 'Jobs') {
      query = query.where((p: any) => p.category.in(['Jobs', 'Careers', 'JOB']));
    } else {
      query = query.where({ category: topic });
    }
  }

  // Cursor-based pagination using createdAt
  if (cursor) {
    query = query.where((p: any) => p.createdAt.lt(toTemporal(new Date(cursor))));
  }

  const { isTestOrDemoOrganization } = await import('@/lib/storefront-filter');
  const fetchedPosts = await query
    .orderBy((p: any) => p.createdAt.desc())
    .limit(limit)
    .include('person', (p: any) => p.select('firstName', 'lastName', 'id').include('profile', (prof: any) => prof.select('avatarUrl')))
    .include('organization', (o: any) => o.select('name', 'id', 'type'))
    .include('likes', (likes: any) => likes.count())
    .include('comments', (comments: any) => comments.count())
    .all();

  const rawPosts = fetchedPosts.filter(
    (p: any) =>
      !p.organizationId ||
      !isTestOrDemoOrganization({ id: p.organizationId, name: p.organization?.name })
  );

  const myLikes = personId
    ? await db.orm.public.PostLike.where({ personId }).select('postId').all()
    : [];
  const myLikedPostIds = new Set(myLikes.map((l: any) => l.postId));

  // Fetch reactions
  const postIds = rawPosts.map((p: any) => p.id);
  let myReactions = new Map<string, ReactionType>();
  if (personId && postIds.length > 0) {
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

  // Fetch user memberships to determine organization post ownership
  const memberships = personId
    ? await db.orm.public.Membership.where({ personId }).all()
    : [];
  const myOrgIds = new Set(memberships.map((m: any) => m.organizationId));

  const posts = rawPosts.map((post: any) => mapPost(post, myLikedPostIds, myReactions, personId, myOrgIds));
  const nextCursor = rawPosts.length === limit
    ? String(rawPosts[rawPosts.length - 1].createdAt)
    : null;

  return { posts, nextCursor };
}

export async function fetchSinglePost(postId: string) {
  const session = await getServerSession(authOptions);
  const personId = session?.user?.personId;

  const post = await db.orm.public.Post.where({ id: postId })
    .include('person', (p: any) => p.select('firstName', 'lastName', 'id').include('profile', (prof: any) => prof.select('avatarUrl')))
    .include('organization', (o: any) => o.select('name', 'id', 'type'))
    .include('likes', (likes: any) => likes.count())
    .include('comments', (comments: any) => comments.count())
    .first();

  if (!post) return null;

  const myLikedPostIds = new Set<string>();
  const myReactions = new Map<string, ReactionType>();
  let myOrgIds: Set<string> | undefined;

  if (personId) {
    const myLike = await db.orm.public.PostLike.where({ personId, postId }).first();
    if (myLike) myLikedPostIds.add(postId);

    try {
      const reaction = await (db.orm.public as any).PostReaction?.where({ personId, postId }).first();
      if (reaction) myReactions.set(postId, reaction.type as ReactionType);
    } catch { /* graceful */ }

    const memberships = await db.orm.public.Membership.where({ personId }).all();
    myOrgIds = new Set(memberships.map((m: any) => m.organizationId));
  }

  // Increment view count
  try {
    await db.orm.public.Post.where({ id: postId }).update({ viewCount: (post.viewCount || 0) + 1 });
  } catch { /* non-fatal */ }

  return mapPost(post, myLikedPostIds, myReactions, personId, myOrgIds);
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
  organizationId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId;

  // If posting as an organization, verify the user belongs to it
  let verifiedOrgId: string | undefined;
  if (data.organizationId) {
    const membership = await db.orm.public.Membership.where({
      personId,
      organizationId: data.organizationId,
    }).all().first();
    if (membership) {
      verifiedOrgId = data.organizationId;
    }
  }

  await db.orm.public.Post.create({
    title: data.title,
    content: data.body,
    category: data.category,
    personId,
    organizationId: verifiedOrgId ?? undefined,
    status: 'PUBLISHED',
    isEmergency: false,
    imageUrl: data.imageUrl,
    videoUrl: data.videoUrl,
    eventDate: data.eventDate ? toTemporal(new Date(data.eventDate)) : undefined,
    location: data.location,
    price: data.price,
    postMetadata: data.postBackground
      ? serializePostMetadata(getPostBackground(data.postBackground).id)
      : data.postMetadata,
  });

  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/feed');
    revalidatePath('/create');
  } catch { /* non-fatal in test runners */ }
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

export async function deletePost(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId;
  const post = await db.orm.public.Post.where({ id: postId }).first();
  if (!post) {
    throw new Error('Post not found');
  }

  let canDelete = post.personId === personId;

  if (!canDelete && post.organizationId) {
    const membership = await db.orm.public.Membership.where({
      organizationId: post.organizationId,
      personId,
    }).first();
    if (membership) {
      canDelete = true;
    }
  }

  if (!canDelete) {
    throw new Error('Forbidden: You can only delete your own posts');
  }

  await db.orm.public.Post.where({ id: postId }).delete();
  return { success: true };
}

export async function updatePost(
  postId: string,
  data: {
    title?: string;
    body: string;
    category?: string;
    location?: string;
    price?: number;
    postBackground?: PostBackgroundId;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId;
  const post = await db.orm.public.Post.where({ id: postId }).first();
  if (!post) {
    throw new Error('Post not found');
  }

  let canEdit = post.personId === personId;

  if (!canEdit && post.organizationId) {
    const membership = await db.orm.public.Membership.where({
      organizationId: post.organizationId,
      personId,
    }).first();
    if (membership) {
      canEdit = true;
    }
  }

  if (!canEdit) {
    throw new Error('Forbidden: You can only edit your own posts');
  }

  const updatePayload: any = {
    content: data.body,
  };

  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.category !== undefined) updatePayload.category = data.category;
  if (data.location !== undefined) updatePayload.location = data.location;
  if (data.price !== undefined) updatePayload.price = data.price;
  if (data.postBackground !== undefined) {
    updatePayload.postMetadata = serializePostMetadata(getPostBackground(data.postBackground).id);
  }

  await db.orm.public.Post.where({ id: postId }).update(updatePayload);
  return { success: true };
}
