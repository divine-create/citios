
'use server'

import { db } from '@/src/prisma/db'
import { requireMembership } from '@/lib/actions/tenant'
import { getCurrentCity } from '@/lib/city'

export async function getNewsAdminData(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();

    if (!org) return null;

    const posts = await db.orm.public.Post.where({ organizationId: org.id }).all();
    const comments = await db.orm.public.Comment.all();
    
    const postsWithComments = posts.map(p => ({
        ...p,
        comments: comments.filter(c => c.postId === p.id)
    }));

    return JSON.parse(JSON.stringify({
      organization: org,
      posts: postsWithComments
    }));
  } catch (error) {
    console.error('Error fetching news data:', error);
    return null;
  }
}

export async function getPublishedNews() {
  try {
    let posts = await db.orm.public.Post.where({ status: 'PUBLISHED' }).all();
    const orgs = await db.orm.public.Organization.all();
    const comments = await db.orm.public.Comment.all();

    // City scope: news is authored by PUBLISHER orgs; only publishers
    // operating in the current city are shown. No city -> no filter.
    const city = await getCurrentCity();
    if (city) {
      const locs = await db.orm.public.Location.where({ }).all();
      const cityOrgIds = new Set(locs.map(l => l.organizationId));
      posts = posts.filter(p => cityOrgIds.has(p.organizationId ?? ''));
    }

    // Sort by emergency first, then by date descending
    const enrichedPosts = posts.map(p => ({
      ...p,
      organization: orgs.find(o => o.id === p.organizationId),
      comments: comments.filter(c => c.postId === p.id)
    })).sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      return new Date(b.createdAt.toString()).getTime() - new Date(a.createdAt.toString()).getTime();
    });

    return JSON.parse(JSON.stringify(enrichedPosts));
  } catch (error) {
    console.error('Error fetching published news:', error);
    return [];
  }
}
