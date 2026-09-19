'use server'

import { requireAuthenticatedAccount } from "@/lib/actions/tenant";

import { db } from '@/src/prisma/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getPostDetails(postId: string) {
    try {
        const post = await db.orm.public.Post.where({ id: postId }).all().first();
        if (!post) return null;

        const org = await db.orm.public.Organization.where({ id: post.organizationId }).all().first();
        const comments = await db.orm.public.Comment.where({ postId: postId }).all();
        const users = await db.orm.public.Person.all();
        const likes = await db.orm.public.PostLike.where({ postId: postId }).all();

        // V1 identity path: Comment.personId -> Person. `user` key + composed
        // `name` preserved for PostView.tsx compatibility (Person has
        // firstName/lastName, not the legacy User.name column).
        const commentsWithUsersMap = new Map();
        comments.forEach(c => {
            const author = users.find(u => u.id === c.personId);
            commentsWithUsersMap.set(c.id, {
                ...c,
                createdAt: c.createdAt.toString(),
                user: author ? { ...author, name: `${author.firstName} ${author.lastName}`.trim() } : null,
                replies: []
            });
        });

        const rootComments: any[] = [];
        commentsWithUsersMap.forEach(c => {
            if (c.parentId) {
                const parent = commentsWithUsersMap.get(c.parentId);
                if (parent) {
                    parent.replies.push(c);
                } else {
                    rootComments.push(c); // fallback if parent missing
                }
            } else {
                rootComments.push(c);
            }
        });
        
        const commentsWithUsers = rootComments;

        let hasLiked = false;
        const session = await getServerSession(authOptions);
        if (session?.user?.email) {
            const currentUser = users.find(u => u.id === session?.user?.email);
            if (currentUser) {
                hasLiked = likes.some(l => l.personId === currentUser.id);
            }
        }

        const enrichedPost = {
            ...post,
            createdAt: post.createdAt.toString(),

            organization: org,
            comments: commentsWithUsers,
            likesCount: likes.length,
            hasLiked,
            shareCount: post.shareCount
        };

        return JSON.parse(JSON.stringify(enrichedPost));
    } catch (error) {
        console.error('Error fetching post:', error);
        return null;
    }
}

export async function addComment(postId: string, content: string, parentId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return JSON.parse(JSON.stringify({ error: 'Not logged in' }));

    const { person } = await requireAuthenticatedAccount();

    const data: any = {
        content,
        postId,
        personId: person.id
    };
    if (parentId) data.parentId = parentId;

    await db.orm.public.Comment.create(data);

    return JSON.parse(JSON.stringify({ success: true }));
}

export async function toggleLike(postId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return JSON.parse(JSON.stringify({ error: 'Not logged in' }));

    const { person } = await requireAuthenticatedAccount();

    const existingLike = await db.orm.public.PostLike.where({ postId, personId: person.id }).all().first();

    if (existingLike) {
        await db.orm.public.PostLike.where({ id: existingLike.id }).delete();
        return JSON.parse(JSON.stringify({ success: true, liked: false }));
    } else {
        await db.orm.public.PostLike.create({ postId, personId: person.id });
        return JSON.parse(JSON.stringify({ success: true, liked: true }));
    }
}

// Publishes an org broadcast to the resident Community Feed — used by admin
// dashboards across verticals ("Publish to Feed" / mass communication).
export async function createOrgPost(input: {
  organizationId: string;
  title: string;
  content: string;
  category: string;
  isEmergency?: boolean;
}) {
  if (!input.title.trim() || !input.content.trim()) {
    return { error: 'Title and content are required.' };
  }

  await db.orm.public.Post.create({
    organizationId: input.organizationId,
    title: input.title.trim(),
    content: input.content.trim(),
    category: input.category.trim() || 'General',
    isEmergency: input.isEmergency ?? false,
    status: 'PUBLISHED',
  });

  return { success: true };
}

export async function sharePost(postId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return JSON.parse(JSON.stringify({ error: 'Not logged in' }));

    const post = await db.orm.public.Post.where({ id: postId }).all().first();
    if (post) {
        await db.orm.public.Post.where({ id: postId }).update({
            shareCount: post.shareCount + 1
        });
    }

    return JSON.parse(JSON.stringify({ success: true }));
}

