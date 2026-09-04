
'use server'

import { db } from '@/src/prisma/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getPostDetails(postId: string) {
    try {
        const post = await db.orm.public.Post.where({ id: postId }).all().first();
        if (!post) return null;

        const org = await db.orm.public.Organization.where({ id: post.organizationId }).all().first();
        const comments = await db.orm.public.Comment.where({ postId: postId }).all();
        const users = await db.orm.public.User.all();
        const likes = await db.orm.public.PostLike.where({ postId: postId }).all();

        const commentsWithUsers = comments.map(c => ({
            ...c,
            createdAt: c.createdAt.toString(),
            user: users.find(u => u.id === c.userId)
        }));

        let hasLiked = false;
        const session = await getServerSession(authOptions);
        if (session?.user?.email) {
            const currentUser = users.find(u => u.email === session?.user?.email);
            if (currentUser) {
                hasLiked = likes.some(l => l.userId === currentUser.id);
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

export async function addComment(postId: string, content: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return JSON.parse(JSON.stringify({ error: 'Not logged in' }));

    const user = await db.orm.public.User.where({ email: session.user.email }).all().first();
    if (!user) return JSON.parse(JSON.stringify({ error: 'User not found' }));

    await db.orm.public.Comment.create({
        content,
        postId,
        userId: user.id
    });

    return JSON.parse(JSON.stringify({ success: true }));
}

export async function toggleLike(postId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return JSON.parse(JSON.stringify({ error: 'Not logged in' }));

    const user = await db.orm.public.User.where({ email: session.user.email }).all().first();
    if (!user) return JSON.parse(JSON.stringify({ error: 'User not found' }));

    const existingLike = await db.orm.public.PostLike.where({ postId, userId: user.id }).all().first();

    if (existingLike) {
        await db.orm.public.PostLike.where({ id: existingLike.id }).delete();
        return JSON.parse(JSON.stringify({ success: true, liked: false }));
    } else {
        await db.orm.public.PostLike.create({ postId, userId: user.id });
        return JSON.parse(JSON.stringify({ success: true, liked: true }));
    }
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

