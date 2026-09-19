'use client';
import { useState, useEffect, useRef } from 'react';
import { getPostDetails, addComment } from '@/lib/actions/post';
import { Send, Loader2, X } from 'lucide-react';
import LoginModal from './LoginModal';

export default function InlineComments({ postId, onCommentAdded }: { postId: string, onCommentAdded?: () => void }) {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    
    // Reply state
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let mounted = true;
        getPostDetails(postId).then(data => {
            if (mounted && data && data.comments) {
                setComments(data.comments);
            }
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, [postId]);

    const handleReplyClick = (comment: any) => {
        setReplyingTo(comment);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        
        setIsSubmitting(true);
        // If we are replying to a reply, attach it to the same parent to keep it 1-level deep
        const actualParentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : undefined;
        
        try {
            const res = await addComment(postId, commentText, actualParentId);
            if (res.error) {
                if (res.error === 'Not logged in') {
                    setIsLoginModalOpen(true);
                } else {
                    alert(res.error);
                }
            } else {
                setCommentText('');
                setReplyingTo(null);
                // Reload comments
                const data = await getPostDetails(postId);
                if (data && data.comments) {
                    setComments(data.comments);
                }
                if (onCommentAdded) onCommentAdded();
            }
        } catch (e: any) {
            console.error("Failed to add comment:", e);
            alert(e.message || "Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderComment = (comment: any, isReply = false) => (
        <div key={comment.id} className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center font-bold text-[11px] text-slate-600 overflow-hidden">
                {comment.user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col w-full">
                <div className="bg-slate-100 px-3 py-2 rounded-2xl w-fit max-w-full">
                    <p className="font-bold text-[13px] text-slate-900 leading-tight mb-0.5">{comment.user?.name || 'Resident'}</p>
                    <p className="text-[13px] text-slate-800 leading-snug">{comment.content}</p>
                </div>
                <div className="flex items-center gap-3 px-2 mt-1">
                    <span className="text-[11px] font-bold text-slate-500 cursor-pointer hover:underline">Like</span>
                    <span onClick={() => handleReplyClick(comment)} className="text-[11px] font-bold text-slate-500 cursor-pointer hover:underline">Reply</span>
                    <span className="text-[11px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                
                {/* Render Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2 space-y-3 pl-2 border-l-2 border-slate-100">
                        {comment.replies.map((reply: any) => renderComment(reply, true))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="w-full mt-1 pt-3 border-t border-slate-100/50 animate-in slide-in-from-top-2 duration-200 px-3 pb-3">
            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {comments.map((comment: any) => renderComment(comment))}
                    {comments.length === 0 && (
                        <p className="text-slate-500 text-[13px] py-2 text-center">Be the first to comment.</p>
                    )}
                </div>
            )}

            {/* Replying To indicator */}
            {replyingTo && (
                <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-t-xl text-[11px] text-slate-500 border border-b-0 border-slate-100">
                    <span>Replying to <span className="font-bold text-slate-700">{replyingTo.user?.name}</span></span>
                    <button onClick={() => setReplyingTo(null)} className="hover:bg-slate-200 p-0.5 rounded-full">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className={`flex gap-2 items-center ${replyingTo ? 'border border-slate-100 p-2 rounded-b-xl rounded-tr-xl bg-white shadow-sm' : ''}`}>
                {!replyingTo && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center font-bold text-[11px] text-slate-600">
                        Me
                    </div>
                )}
                <div className="flex-1 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="w-full bg-slate-100 border border-slate-200 rounded-full pl-4 pr-10 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                        disabled={isSubmitting}
                    />
                    <button 
                        type="submit"
                        disabled={!commentText.trim() || isSubmitting}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700 disabled:text-slate-300 p-1"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
            
            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
            />
        </div>
    );
}
