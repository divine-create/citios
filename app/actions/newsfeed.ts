'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function fetchFeed(filter: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId;

  // Map filters
  let postsClause: any = {};

  if (filter === 'Following') {
    const follows = await db.orm.public.Follow.where({ personId }).select('organizationId').all();
    const followedOrgIds = follows.map((f: any) => f.organizationId);

    if (followedOrgIds.length === 0) {
      return [];
    }
    // Prisma 8 `.in()` syntax
    postsClause = { organizationId: { in: followedOrgIds } };
  } else if (filter !== 'For you' && filter !== 'All') {
    postsClause = { category: filter };
  }

  const rawPosts = await db.orm.public.Post.where(postsClause)
    .orderBy((p: any) => p.createdAt.desc())
    .limit(50)
    .include('person', (p: any) => p.select('firstName', 'lastName', 'id').include('profile', (prof: any) => prof.select('avatarUrl')))
    .include('organization', (o: any) => o.select('name', 'id'))
    .include('likes', (likes: any) => likes.count())
    .include('comments', (comments: any) => comments.count())
    .all();

  // In Prisma 8 ORM, the array of likes doesn't easily filter inside the include for existence without custom logic,
  // so we'll fetch my likes separately.
  const myLikes = await db.orm.public.PostLike.where({ personId }).select('postId').all();
  const myLikedPostIds = new Set(myLikes.map((l: any) => l.postId));

  return rawPosts.map((post: any) => {
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
      likes: post.likes || 0,
      comments: post.comments || 0,
      shares: post.shareCount || 0,
      isLikedByMe: myLikedPostIds.has(post.id),
      orgId: post.organizationId,
    };
  });
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
    postMetadata: data.postMetadata,
  });
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
