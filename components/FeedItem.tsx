import { MoreHorizontal, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Card, Button } from './Shared';
import Image from 'next/image';
import React from 'react';

export interface FeedItemProps {
    author: string;
    avatarInitials?: string;
    avatarIcon?: React.ReactNode;
    avatarColor?: string;
    time: string;
    category: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    eventDate?: string;
    location?: string;
    price?: number;
    widget?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
    likes: number;
    comments: number;
    hasLiked?: boolean;
    variant?: 'default' | 'emergency' | 'event';
    commentsSection?: React.ReactNode;
}

export default function FeedItem({
    author, avatarInitials, avatarIcon, avatarColor = "bg-slate-100 text-slate-600",
    time, category, content, imageUrl, videoUrl, eventDate, location, price, widget, actionLabel, onAction, onComment, onLike, onShare, likes, comments, hasLiked, variant = 'default', commentsSection
}: FeedItemProps) {
    let cardStyle = "p-4 md:p-5";
    if (imageUrl) cardStyle = "p-0 overflow-hidden";
    if (variant === 'emergency') cardStyle += " border-2 border-red-500 bg-red-50";
    else if (variant === 'event') cardStyle += " border-2 border-orange-200 bg-orange-50/50";

    return (
        <Card className={cardStyle}>
            <div className={imageUrl ? "p-4 md:p-5" : ""}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${avatarColor}`}>
                            {avatarIcon || avatarInitials}
                        </div>
                        <div>
                            <p className="font-bold text-sm text-slate-900">{author}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{time} • {category}</p>
                        </div>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
                
                {/* Content */}
                <p className="text-sm text-slate-700 mb-4 leading-relaxed">{content}</p>
                
                {/* Media */}
                {imageUrl && (
                    <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden mb-4">
                        <Image src={imageUrl} alt="Post media" fill className="object-cover" referrerPolicy="no-referrer" />
                    </div>
                )}
                
                {/* Custom Widget */}
                {videoUrl && (
                    <div className="mb-4 text-[13px] font-bold text-teal-700 bg-teal-50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
                        🔗 <a href={videoUrl} target="_blank" rel="noreferrer" className="hover:underline">Watch Video</a>
                    </div>
                )}
                
                {(eventDate || location || price !== undefined) && (
                    <div className="mb-4 bg-slate-50 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-slate-600 font-medium border border-slate-100">
                        {eventDate && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">📅</span> 
                                {new Date(eventDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        )}
                        {location && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">📍</span> {location}
                            </div>
                        )}
                        {price !== undefined && (
                            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                                <span className="text-emerald-500/70">💲</span> $\{price.toFixed(2)}
                            </div>
                        )}
                    </div>
                )}
                
                {widget && <div className="mb-4">{widget}</div>}

                {/* Action Button */}
                {actionLabel && (
                    <Button variant="accent" className="w-full mb-4" onClick={onAction}>
                        {actionLabel}
                    </Button>
                )}
                
                {/* Engagement Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-slate-500">
                    <button onClick={onLike} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${hasLiked ? 'text-orange-500' : 'hover:text-orange-500'}`}>
                        <Heart className={`w-4 h-4 ${hasLiked ? 'fill-orange-500 text-orange-500' : ''}`} /> {likes}
                    </button>
                    <button onClick={onComment} className="flex items-center gap-1.5 text-xs font-bold hover:text-teal-600 transition-colors">
                        <MessageCircle className="w-4 h-4" /> {comments}
                    </button>
                    <button onClick={onShare} className="flex items-center gap-1.5 text-xs font-bold hover:text-teal-600 transition-colors">
                        <Share2 className="w-4 h-4" /> Share
                    </button>
                </div>
                {commentsSection}
            </div>
        </Card>
    );
}
