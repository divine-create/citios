'use client';
import { useState, useEffect } from 'react';
import { getPostDetails, addComment } from '@/lib/actions/post';
import { Send, Loader2 } from 'lucide-react';
import LoginModal from './LoginModal';

export default function InlineComments({ postId, onCommentAdded }: { postId: string, onCommentAdded?: () => void }) {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        
        setIsSubmitting(true);
        const res = await addComment(postId, commentText);
        if (res.error) {
            if (res.error === 'Not logged in') {
                setIsLoginModalOpen(true);
            } else {
                alert(res.error);
            }
        } else {
            setCommentText('');
            // Reload comments
            const data = await getPostDetails(postId);
            if (data && data.comments) {
                setComments(data.comments);
            }
            if (onCommentAdded) onCommentAdded();
        }
        setIsSubmitting(false);
    };

    return (
        <div className="w-full mt-1 pt-3 border-t border-slate-100/50 animate-in slide-in-from-top-2 duration-200 px-3 pb-3">
            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {comments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center font-bold text-[11px] text-slate-600 overflow-hidden">
                                {comment.user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex flex-col">
                                <div className="bg-slate-100 px-3 py-2 rounded-2xl w-fit max-w-full">
                                    <p className="font-bold text-[13px] text-slate-900 leading-tight mb-0.5">{comment.user?.name || 'Resident'}</p>
                                    <p className="text-[13px] text-slate-800 leading-snug">{comment.content}</p>
                                </div>
                                <div className="flex items-center gap-3 px-2 mt-1">
                                    <span className="text-[11px] font-bold text-slate-500 cursor-pointer hover:underline">Like</span>
                                    <span className="text-[11px] font-bold text-slate-500 cursor-pointer hover:underline">Reply</span>
                                    <span className="text-[11px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p className="text-slate-500 text-[13px] py-2">Be the first to comment.</p>
                    )}
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center font-bold text-[11px] text-slate-600">
                    Me
                </div>
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Write a comment..."
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
