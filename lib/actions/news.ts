
'use server'

import { db } from '@/src/prisma/db'

export async function getNewsAdminData() {
  try {
    const org = await db.orm.public.Organization.where({ type: 'PUBLISHER' }).all().first();

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
    const posts = await db.orm.public.Post.where({ status: 'PUBLISHED' }).all();
    const orgs = await db.orm.public.Organization.all();
    const comments = await db.orm.public.Comment.all();

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
