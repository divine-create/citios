
'use client';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FeedItem from './FeedItem';
import { addComment, toggleLike, sharePost } from '@/lib/actions/post';
import LoginModal from './LoginModal';

export default function PostView({ post }: { post: any }) {
    const router = useRouter();
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [hasLiked, setHasLiked] = useState(post?.hasLiked || false);
    const [likesCount, setLikesCount] = useState(post?.likesCount || 0);
    const [shareCount, setShareCount] = useState(post?.shareCount || 0);
    
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        
        setIsSubmitting(true);
        const res = await addComment(post.id, commentText);
        if (res.error) {
            if (res.error === 'Not logged in') {
                setIsLoginModalOpen(true);
            } else {
                alert(res.error);
            }
        } else {
            setCommentText('');
            router.refresh();
        }
        setIsSubmitting(false);
    };

    const handleLike = async () => {
        const previousLiked = hasLiked;
        const previousCount = likesCount;
        setHasLiked(!previousLiked);
        setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);
        
        const res = await toggleLike(post.id);
        if (res.error) {
            setHasLiked(previousLiked);
            setLikesCount(previousCount);
            if (res.error === 'Not logged in') {
                setIsLoginModalOpen(true);
            } else {
                alert(res.error);
            }
        }
    };

    const handleShare = async () => {
        setShareCount(shareCount + 1);
        const res = await sharePost(post.id);
        if (res.error) {
            setShareCount(shareCount);
            if (res.error === 'Not logged in') {
                setIsLoginModalOpen(true);
            } else {
                alert(res.error);
            }
        } else {
            alert("Thanks for sharing!");
        }
    };

    if (!post) {
        return <div className="text-center py-20">Post not found</div>;
    }

    const feedPostProps = {
        id: post.id,
        author: post.organization?.name || 'Unknown',
        time: new Date(post.createdAt).toLocaleDateString(),
        category: post.category,
        content: post.title + '\n\n' + post.content,
        likes: likesCount,
        hasLiked: hasLiked,
        onLike: handleLike,
        onShare: handleShare,
        comments: post.comments?.length || 0,
        variant: post.isEmergency ? 'emergency' as const : 'default' as const
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                <button onClick={() => router.push('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-lg">Post Details</h1>
            </div>

            {/* Main Post */}
            <FeedItem {...feedPostProps} />

            {/* Comments Section */}
            <div className="px-4">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Comments ({post.comments?.length || 0})
                </h3>

                <div className="space-y-4 mb-8">
                    {post.comments?.map((comment: any) => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center font-bold text-xs">
                                {comment.user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none">
                                <p className="font-bold text-xs text-slate-700 mb-1">{comment.user?.name || 'Resident'}</p>
                                <p className="text-sm text-slate-800">{comment.content}</p>
                            </div>
                        </div>
                    ))}
                    {(!post.comments || post.comments.length === 0) && (
                        <p className="text-slate-500 text-sm text-center py-4">No comments yet. Be the first to share your thoughts!</p>
                    )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-slate-100 border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500"
                        disabled={isSubmitting}
                    />
                    <button 
                        type="submit"
                        disabled={!commentText.trim() || isSubmitting}
                        className="w-11 h-11 rounded-full bg-teal-800 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>

            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
            />
        </div>
    );
}
