
'use client';
import { useState } from 'react';
import FeedItem, { FeedItemProps } from './FeedItem';
import { toggleLike, sharePost } from '@/lib/actions/post';
import LoginModal from './LoginModal';

interface InteractiveFeedItemProps extends Omit<FeedItemProps, 'onLike' | 'onShare' | 'onComment' | 'likes' | 'hasLiked'> {
    onComment?: () => void;
    postId: string;
    initialLikes: number;
    initialHasLiked: boolean;
    initialShareCount: number;
}

export default function InteractiveFeedItem({ 
    postId, 
    initialLikes, 
    initialHasLiked, 
    initialShareCount,
    ...props 
}: InteractiveFeedItemProps) {
    const [hasLiked, setHasLiked] = useState(initialHasLiked);
    const [likesCount, setLikesCount] = useState(initialLikes);
    const [shareCount, setShareCount] = useState(initialShareCount);
    
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const handleLike = async () => {
        const previousLiked = hasLiked;
        const previousCount = likesCount;
        setHasLiked(!previousLiked);
        setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);
        
        const res = await toggleLike(postId);
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
        const res = await sharePost(postId);
        if (res.error) {
            setShareCount(shareCount);
            if (res.error === 'Not logged in') {
                setIsLoginModalOpen(true);
            } else {
                alert(res.error);
            }
        } else {
            alert('Thanks for sharing!');
        }
    };

    return (
        <>
            <FeedItem 
                {...props}
                likes={likesCount}
                hasLiked={hasLiked}
                onLike={handleLike}
                onShare={handleShare}
                onComment={props.onComment}
            />
            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
            />
        </>
    );
}
