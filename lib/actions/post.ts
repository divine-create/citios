'use server'

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { notifyPerson } from '@/lib/notify';
import { findPersonByEmail } from '@/lib/identity';

export async function resolveAuthenticatedPerson() {
    const session = await getServerSession(authOptions);
    const candidatePersonId = session?.user?.personId || (session?.user as any)?.id;
    if (!session?.user?.email && !candidatePersonId) {
        throw new Error('Not logged in');
    }

    let person: any = null;
    if (candidatePersonId) {
        person = await db.orm.public.Person.where({ id: candidatePersonId }).all().first();
    }
    if (!person && session?.user?.email) {
        person = await findPersonByEmail(session.user.email);
    }

    if (!person) {
        throw new Error('Person record not found');
    }

    // Guard against suspended/deactivated accounts if an Account record exists
    try {
        const account = await db.orm.public.Account.where({ personId: person.id }).all().first();
        if (account && !account.isActive) {
            throw new Error('Account is deactivated or suspended');
        }
    } catch (e: any) {
        if (e.message?.includes('deactivated')) throw e;
    }

    return { session, person };
}

export async function getPostDetails(postId: string) {
    try {
        const post = await db.orm.public.Post.where({ id: postId }).include('person', (p: any) => p.select('firstName', 'lastName', 'id').include('profile', (prof: any) => prof.select('avatarUrl'))).all().first();
        if (!post) return null;

        const org = await db.orm.public.Organization.where({ id: post.organizationId }).all().first();
        const comments = await db.orm.public.Comment.where({ postId: postId }).all();
        const likes = await db.orm.public.PostLike.where({ postId: postId }).all();

        const commenterPersonIds = Array.from(new Set(comments.map((c: any) => c.personId).filter(Boolean)));
        const users = commenterPersonIds.length > 0 
            ? await db.orm.public.Person.where((p: any) => p.id.in(commenterPersonIds)).all()
            : [];

        const avatarMap = new Map<string, string>();
        if (commenterPersonIds.length > 0) {
            try {
                const profiles = await db.orm.public.ResidentProfile.where((p: any) => p.personId.in(commenterPersonIds)).all();
                profiles.forEach((p: any) => {
                    if (p.avatarUrl) avatarMap.set(p.personId, p.avatarUrl);
                });
            } catch {}
        }

        // Fetch comment likes for these comments
        const commentIds = comments.map((c: any) => c.id);
        const commentLikes = commentIds.length > 0
            ? await db.orm.public.CommentLike.where((cl: any) => cl.commentId.in(commentIds)).all()
            : [];

        // Resolve current viewer identity accurately
        let currentPersonId: string | null = null;
        try {
            const session = await getServerSession(authOptions);
            const candidatePersonId = session?.user?.personId || (session?.user as any)?.id;
            if (candidatePersonId) {
                currentPersonId = candidatePersonId;
            } else if (session?.user?.email) {
                const person = await findPersonByEmail(session.user.email);
                if (person) currentPersonId = person.id;
            }
        } catch {}

        const hasLiked = currentPersonId ? likes.some((l: any) => l.personId === currentPersonId) : false;

        // Sort comments chronologically so root comments and replies render deterministically
        const toEpoch = (val: any) => {
            if (!val) return 0;
            if (typeof val.epochMilliseconds === 'number') return val.epochMilliseconds;
            return new Date(val.toString()).getTime();
        };
        comments.sort((a: any, b: any) => toEpoch(a.createdAt) - toEpoch(b.createdAt));

        // V1 identity path: Comment.personId -> Person. `user` key + composed
        // `name` preserved for UI compatibility.
        const commentsWithUsersMap = new Map();
        comments.forEach(c => {
            const author = users.find((u: any) => u.id === c.personId);
            const rawAvatar = c.personId ? avatarMap.get(c.personId) : null;
            const avatarUrl = rawAvatar ? (rawAvatar.startsWith('http') || rawAvatar.startsWith('/') ? rawAvatar : `/api/assets/${rawAvatar}`) : null;
            const cLikes = commentLikes.filter((cl: any) => cl.commentId === c.id);
            const hasLikedComment = currentPersonId ? cLikes.some((cl: any) => cl.personId === currentPersonId) : false;

            commentsWithUsersMap.set(c.id, {
                ...c,
                createdAt: c.createdAt.toString(),
                likesCount: cLikes.length,
                hasLiked: hasLikedComment,
                user: author ? {
                    ...author,
                    name: `${author.firstName} ${author.lastName}`.trim(),
                    avatarUrl,
                } : null,
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

        const enrichedPost = {
            ...post,
            createdAt: post.createdAt.toString(),
            organization: org,
            comments: commentsWithUsers,
            likesCount: likes.length,
            hasLiked,
            shareCount: post.shareCount || 0
        };

        return JSON.parse(JSON.stringify(enrichedPost));
    } catch (error) {
        console.error('Error fetching post:', error);
        return null;
    }
}

export async function addComment(postId: string, content: string, parentId?: string) {
    try {
        const trimmed = (content || '').trim();
        if (!trimmed) {
            return JSON.parse(JSON.stringify({ error: 'Comment cannot be empty' }));
        }

        const { person } = await resolveAuthenticatedPerson();
    
        const data: any = {
            content: trimmed,
            postId,
            personId: person.id
        };
        if (parentId) data.parentId = parentId;
    
        await db.orm.public.Comment.create(data);

        // If parentId is provided, notify parent comment author
        let parentComment: any = null;
        if (parentId) {
            parentComment = await db.orm.public.Comment.where({ id: parentId }).all().first();
            if (parentComment?.personId && parentComment.personId !== person.id) {
                await notifyPerson(parentComment.personId, {
                    type: 'POST_COMMENT',
                    title: 'New Reply to Your Comment',
                    body: `${person.firstName || 'Someone'} replied: "${trimmed.length > 30 ? trimmed.slice(0, 30) + '...' : trimmed}"`,
                    href: `/post/${postId}`,
                });
            }
        }

        // Fetch the post to notify the author if not already notified as parent author
        const post = await db.orm.public.Post.where({ id: postId }).all().first();
        if (post && post.personId && post.personId !== person.id && post.personId !== parentComment?.personId) {
            await notifyPerson(post.personId, {
                type: 'POST_COMMENT',
                title: 'New Comment on Your Post',
                body: `${person.firstName || 'Someone'} commented: "${trimmed.length > 30 ? trimmed.slice(0, 30) + '...' : trimmed}"`,
                href: `/post/${postId}`,
            });
        }
        
        try {
            revalidatePath(`/post/${postId}`);
            revalidatePath(`/feed/${postId}`);
            revalidatePath(`/feed`);
        } catch(e) {}
    
        return JSON.parse(JSON.stringify({ success: true }));
    } catch (error: any) {
        console.error("addComment error:", error);
        return JSON.parse(JSON.stringify({ error: error.message || 'Failed to add comment' }));
    }
}

export async function toggleLike(postId: string) {
    try {
        const { person } = await resolveAuthenticatedPerson();

        const post = await db.orm.public.Post.where({ id: postId }).all().first();
        if (!post) {
            return JSON.parse(JSON.stringify({ error: 'Post not found' }));
        }

        const existingLike = await db.orm.public.PostLike.where({ postId, personId: person.id }).all().first();

        let liked = false;
        if (existingLike) {
            await db.orm.public.PostLike.where({ id: existingLike.id }).delete();
            liked = false;
        } else {
            await db.orm.public.PostLike.create({ postId, personId: person.id });
            liked = true;

            if (post.personId && post.personId !== person.id) {
                await notifyPerson(post.personId, {
                    type: 'POST_LIKE',
                    title: 'New Like on Your Post',
                    body: `${person.firstName || 'Someone'} liked your post`,
                    href: `/post/${postId}`,
                });
            }
        }

        try {
            revalidatePath(`/post/${postId}`);
            revalidatePath(`/feed/${postId}`);
            revalidatePath(`/feed`);
        } catch {}

        return JSON.parse(JSON.stringify({ success: true, liked }));
    } catch (error: any) {
        console.error("toggleLike error:", error);
        return JSON.parse(JSON.stringify({ error: error.message || 'Failed to toggle like' }));
    }
}

export async function toggleCommentLike(commentId: string) {
    try {
        const { person } = await resolveAuthenticatedPerson();

        const cleanCommentId = (commentId || '').trim();
        const comment = await db.orm.public.Comment.where({ id: cleanCommentId }).all().first();
        if (!comment) {
            return JSON.parse(JSON.stringify({ error: 'Comment not found' }));
        }

        const existingLike = await db.orm.public.CommentLike.where({ commentId: cleanCommentId, personId: person.id }).all().first();

        let liked = false;
        if (existingLike) {
            await db.orm.public.CommentLike.where({ id: existingLike.id }).delete();
            liked = false;
        } else {
            await db.orm.public.CommentLike.create({ commentId: cleanCommentId, personId: person.id });
            liked = true;

            if (comment.personId && comment.personId !== person.id) {
                const isReply = Boolean(comment.parentId);
                try {
                    await notifyPerson(comment.personId, {
                        type: 'POST_LIKE',
                        title: isReply ? 'New Like on Your Reply' : 'New Like on Your Comment',
                        body: `${person.firstName || 'Someone'} liked your ${isReply ? 'reply' : 'comment'}`,
                        href: `/feed/${comment.postId}`,
                    });
                } catch (notifErr) {
                    console.error('Failed to notify comment author:', notifErr);
                }
            }
        }

        // Fresh total likesCount for this comment or reply
        const allCommentLikes = await db.orm.public.CommentLike.where({ commentId: cleanCommentId }).all();
        const likesCount = allCommentLikes.length;

        try {
            revalidatePath(`/post/${comment.postId}`);
            revalidatePath(`/feed/${comment.postId}`);
            revalidatePath(`/feed`);
        } catch {}

        return JSON.parse(JSON.stringify({ success: true, liked, likesCount }));
    } catch (error: any) {
        console.error("toggleCommentLike error:", error);
        return JSON.parse(JSON.stringify({ error: error.message || 'Failed to toggle comment like' }));
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
    try {
        await resolveAuthenticatedPerson();

        const post = await db.orm.public.Post.where({ id: postId }).all().first();
        if (post) {
            await db.orm.public.Post.where({ id: postId }).update({
                shareCount: (post.shareCount || 0) + 1
            });
        }

        return JSON.parse(JSON.stringify({ success: true }));
    } catch (error: any) {
        return JSON.parse(JSON.stringify({ error: error.message || 'Failed to share post' }));
    }
}
