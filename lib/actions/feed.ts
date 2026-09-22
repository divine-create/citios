
'use server'

import { db } from '@/src/prisma/db'
import { getCurrentCity } from '@/lib/city'

export async function getCommunityFeed() {
  try {
    // City scope: organization-authored posts must belong to orgs operating
    // in the current city. Personal (resident-authored) posts have no city
    // semantics yet, so they stay. No city resolved -> no filter (old behavior).
    const city = await getCurrentCity();
    let posts = await db.orm.public.Post.all();
    let orgs = [];
    if (city) {
      const locs = await db.orm.public.Location.where({ }).all();
      const cityOrgIds = new Set(locs.map(l => l.organizationId));
      posts = posts.filter(p => !p.organizationId || cityOrgIds.has(p.organizationId));
      const orgIdsArr = Array.from(cityOrgIds);
      orgs = orgIdsArr.length > 0 ? await db.orm.public.Organization.where(o => o.id.in(orgIdsArr)).all() : [];
    } else {
      orgs = await db.orm.public.Organization.all();
    }
    
    const postIds = posts.map(p => p.id);
    const comments = postIds.length > 0 ? await db.orm.public.Comment.where(c => c.postId.in(postIds)).all() : [];
    const likes = postIds.length > 0 ? await db.orm.public.PostLike.where(l => l.postId.in(postIds)).all() : [];
    
    const userIdsArr = Array.from(new Set([...posts.map(p=>p.personId), ...comments.map(c=>c.personId)].filter(Boolean) as string[]));
    const users = userIdsArr.length > 0 ? await db.orm.public.Person.where(p => p.id.in(userIdsArr)).all() : [];

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


