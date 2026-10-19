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

function resolveAvatarUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `/api/assets/${trimmed}`;
}

interface OrgMetadataBatch {
  verifiedOrgIds: Set<string>;
  orgLogos: Map<string, string>;
}

async function getOrgMetadataBatch(orgIds: string[]): Promise<OrgMetadataBatch> {
  const filtered = Array.from(new Set(orgIds.filter(Boolean)));
  const verifiedSet = new Set<string>();
  const logoMap = new Map<string, string>();
  if (filtered.length === 0) return { verifiedOrgIds: verifiedSet, orgLogos: logoMap };

  try {
    const listings = await db.orm.public.DiscoveryListing.where((l: any) => l.organizationId.in(filtered)).all();
    for (const l of listings) {
      if (l.organizationId) {
        let meta: any = null;
        if (l.metadata) {
          try {
            meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata;
            if (Boolean(meta?.isVerified)) {
              verifiedSet.add(l.organizationId);
            }
          } catch {}
        }
        const fallbackLogo = meta?.logoUrl || l.coverAssetId || meta?.coverImage || meta?.images?.[0];
        if (fallbackLogo && !logoMap.has(l.organizationId)) {
          logoMap.set(l.organizationId, fallbackLogo);
        }
      }
    }
  } catch (err) {
    console.warn('[newsfeed] Error checking discoveryListing metadata & verifications:', err);
  }

  try {
    const { getServicesConfig } = await import('@/lib/actions/services-config');
    const svcConfig = await getServicesConfig();
    if (Array.isArray(svcConfig.verifiedOrgIds)) {
      for (const id of svcConfig.verifiedOrgIds) {
        if (filtered.includes(id)) {
          verifiedSet.add(id);
        }
      }
    }
  } catch (err) {
    console.warn('[newsfeed] Error checking servicesConfig verifications:', err);
  }

  return { verifiedOrgIds: verifiedSet, orgLogos: logoMap };
}

function mapPost(
  post: any,
  myLikedPostIds: Set<string>,
  myReactions: Map<string, ReactionType>,
  currentPersonId?: string,
  myOrgIds?: Set<string>,
  verifiedOrgIds: Set<string> = new Set(),
  orgLogos: Map<string, string> = new Map()
) {
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

  const reviewedOrgId = parsedRawMeta?.reviewedOrgId || post.organizationId || '';
  const isPostOrgVerified = Boolean(post.organizationId && verifiedOrgIds.has(post.organizationId));
  const isReviewedOrgVerified = Boolean(reviewedOrgId && verifiedOrgIds.has(reviewedOrgId));

  let avatarImg: string | undefined = undefined;
  if (isOrg) {
    const rawLogo = post.organization?.logoAssetId || (post.organizationId ? orgLogos.get(post.organizationId) : undefined);
    avatarImg = resolveAvatarUrl(rawLogo);
  } else if (post.person) {
    avatarImg = resolveAvatarUrl(post.person?.profile?.avatarUrl);
  }

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
        reviewedOrgId,
        reviewedOrgName:
          parsedRawMeta?.reviewedOrgName || post.organization?.name || 'Local Business',
        reviewedOrgCategory: parsedRawMeta?.reviewedOrgCategory || 'Business',
        reviewedOrgAddress: parsedRawMeta?.reviewedOrgAddress || post.location || 'Calabar',
        reviewedOrgCover: parsedRawMeta?.reviewedOrgCover || resolveAvatarUrl(post.organization?.logoAssetId || orgLogos.get(reviewedOrgId)) || null,
        isOrgVerified: isReviewedOrgVerified,
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
  } else if (
    (post.linkedEntityType === 'STAY' || post.linkedEntityType === 'HOTEL' || post.organization?.type === 'HOTEL') &&
    (post.linkedEntityId || post.organizationId)
  ) {
    href = { url: `/stay/${post.linkedEntityId || post.organizationId}`, label: 'View Stay & Book →' };
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
    isVerified: isOrg ? isPostOrgVerified : false,
    authorId: isOrg ? post.organizationId : post.personId,
    avatarImg,
    time: post.createdAt ? String(post.createdAt) : new Date().toISOString(),
    category: post.category,
    title: post.title,
    body: post.content,
    image: resolveAvatarUrl(post.imageUrl),
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
      query = query.where((p: any) => p.category.in(['Offer', 'Sales', 'Marketplace', 'RETAIL', 'Shops']));
    } else if (topic === 'Services') {
      query = query.where((p: any) => p.category.in(['Services', 'Service', 'SERVICE']));
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
    } else if (topic === 'Community') {
      query = query.where((p: any) => p.category.in(['Community', 'Update', 'Question', 'Ask the city']));
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
    .include('organization', (o: any) => o.select('name', 'id', 'type', 'logoAssetId'))
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

  // Determine which organizations in these posts are verified and resolve logos
  const allOrgIds = new Set<string>();
  for (const p of rawPosts) {
    if (p.organizationId) allOrgIds.add(p.organizationId);
    if (p.postMetadata) {
      try {
        const meta = JSON.parse(p.postMetadata);
        if (meta?.reviewedOrgId) allOrgIds.add(meta.reviewedOrgId);
      } catch {}
    }
  }
  const { verifiedOrgIds, orgLogos } = await getOrgMetadataBatch(Array.from(allOrgIds));

  const posts = rawPosts.map((post: any) => mapPost(post, myLikedPostIds, myReactions, personId, myOrgIds, verifiedOrgIds, orgLogos));
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
    .include('organization', (o: any) => o.select('name', 'id', 'type', 'logoAssetId'))
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

  const allOrgIds = new Set<string>();
  if (post.organizationId) allOrgIds.add(post.organizationId);
  if (post.postMetadata) {
    try {
      const meta = JSON.parse(post.postMetadata);
      if (meta?.reviewedOrgId) allOrgIds.add(meta.reviewedOrgId);
    } catch {}
  }
  const { verifiedOrgIds, orgLogos } = await getOrgMetadataBatch(Array.from(allOrgIds));

  return mapPost(post, myLikedPostIds, myReactions, personId, myOrgIds, verifiedOrgIds, orgLogos);
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
  phone?: string;
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

  const normalizedCategory = data.category.trim();

  // 1. AUTO-BRIDGE: Event -> Create official Event in calendar + auto-linked Post
  if (normalizedCategory === 'Event' && data.eventDate) {
    const { createUniversalEvent } = await import('@/lib/actions/events');
    const result = await createUniversalEvent({
      hostType: verifiedOrgId ? 'ORGANIZATION' : 'PERSONAL',
      organizationId: verifiedOrgId,
      title: data.title,
      description: data.body,
      location: data.location || 'Calabar',
      date: data.eventDate,
      price: data.price ? Number(data.price) : 0,
      imageUrl: data.imageUrl,
      shareToFeed: true,
    });
    if ((result as any)?.error) {
      throw new Error((result as any).error);
    }
    return { success: true };
  }

  // 2. AUTO-BRIDGE: Housing -> Create official DiscoveryListing in CityStay + auto-linked Post
  if (normalizedCategory === 'Housing') {
    const { createUniversalStay } = await import('@/lib/actions/stays');
    let phone = data.phone?.trim();
    if (!phone) {
      try {
        const profile = await db.orm.public.ResidentProfile.where({ personId }).first();
        phone = profile?.phone || '';
      } catch {}
    }
    if (!phone || phone.length < 8) {
      phone = '08000000000'; // safe fallback to allow listing
    }

    const result = await createUniversalStay({
      hostType: verifiedOrgId ? 'ORGANIZATION' : 'PERSONAL',
      organizationId: verifiedOrgId,
      title: data.title,
      stayCategory: 'Short-Let',
      description: data.body,
      neighborhood: data.location || 'Calabar',
      address: data.location || 'Calabar',
      price: data.price ? Number(data.price) : 0,
      whatsappPhone: phone,
      images: data.imageUrl ? [data.imageUrl] : [],
      shareToFeed: true,
    });
    if ((result as any)?.error) {
      throw new Error((result as any).error);
    }
    return { success: true };
  }

  // 3. AUTO-BRIDGE: Sales -> If posting as a RETAIL store organization, create RetailProduct in ShopOS
  let linkedEntityType: string | undefined;
  let linkedEntityId: string | undefined;

  if ((normalizedCategory === 'Sales' || normalizedCategory === 'Offer') && verifiedOrgId) {
    try {
      const org = await db.orm.public.Organization.where({ id: verifiedOrgId }).first();
      if (org && org.type === 'RETAIL') {
        const product = await db.orm.public.RetailProduct.create({
          organizationId: org.id,
          name: data.title,
          description: data.body,
          price: data.price ? Number(data.price) : 0,
          imageAssetId: data.imageUrl,
          stockQuantity: 99,
          unit: 'ea',
        });
        linkedEntityType = 'RETAIL_PRODUCT';
        linkedEntityId = product.id;
      }
    } catch (e) {
      console.warn('[createPost] Auto-bridge to RetailProduct non-fatal error:', e);
    }
  }

  // 4. Create Canonical Post Record
  await db.orm.public.Post.create({
    title: data.title,
    content: data.body,
    category: normalizedCategory,
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
    linkedEntityType,
    linkedEntityId,
  });

  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/feed');
    revalidatePath('/create');
    revalidatePath('/market');
    revalidatePath('/events');
    revalidatePath('/stay');
  } catch { /* non-fatal in test runners */ }

  return { success: true };
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

  // Two-way deletion bridge: Clean up linked marketplace entities
  if (post.linkedEntityType === 'EVENT' && post.linkedEntityId) {
    try {
      await db.orm.public.Event.where({ id: post.linkedEntityId }).delete();
    } catch (e) {
      console.warn('[deletePost] Failed to delete linked event:', e);
    }
  } else if (post.linkedEntityType === 'STAY' && post.linkedEntityId) {
    try {
      await db.orm.public.DiscoveryListing.where({ id: post.linkedEntityId }).delete();
    } catch (e) {
      console.warn('[deletePost] Failed to delete linked stay listing:', e);
    }
  } else if (post.linkedEntityType === 'RETAIL_PRODUCT' && post.linkedEntityId) {
    try {
      await db.orm.public.RetailProduct.where({ id: post.linkedEntityId }).delete();
    } catch (e) {
      console.warn('[deletePost] Failed to delete linked retail product:', e);
    }
  }

  await db.orm.public.Post.where({ id: postId }).delete();

  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/feed');
    revalidatePath('/events');
    revalidatePath('/stay');
    revalidatePath('/market');
  } catch {}

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
