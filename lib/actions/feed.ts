
'use server'

import { db } from '@/src/prisma/db'
import { getCurrentCity } from '@/lib/city'

export async function getCommunityFeed() {
  try {
    // City scope: organization-authored posts must belong to orgs operating
    // in the current city. Personal (resident-authored) posts have no city
    // semantics yet, so they stay. No city resolved -> no filter (old behavior).
    const city = await getCurrentCity();
    const orgs = await db.orm.public.Organization.all();
    const cityOrgIds = city ? new Set(orgs.filter(o => o.cityId === city.id).map(o => o.id)) : null;
    const posts = (await db.orm.public.Post.all()).filter(p =>
      !cityOrgIds || !p.organizationId || cityOrgIds.has(p.organizationId)
    );
    const comments = await db.orm.public.Comment.all();
    const likes = await db.orm.public.PostLike.all();
    const users = await db.orm.public.Person.all();

    let session;
    try {
        const { getServerSession } = require('next-auth');
        const { authOptions } = require('@/lib/auth');
        session = await getServerSession(authOptions);
    } catch(e) {}

    let currentUser = null;
    if (session?.user?.email) {
        currentUser = users.find(u => u.id === session?.user?.personId);
    }

    // Stitch relations and order by emergency first, then date descending
    const enrichedPosts = posts.map(p => {
      const postLikes = likes.filter(l => l.postId === p.id);
      return JSON.parse(JSON.stringify({
        ...p,
        createdAt: p.createdAt.toString(),

        organization: orgs.find(o => o.id === p.organizationId),
        comments: comments.filter(c => c.postId === p.id),
        likesCount: postLikes.length,
        hasLiked: currentUser ? postLikes.some(l => l.personId === currentUser.id) : false,
        shareCount: p.shareCount || 0
      }));
    }).sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return JSON.parse(JSON.stringify(enrichedPosts));
  } catch (error) {
    console.error('Error fetching feed:', error);
    return [];
  }
}

