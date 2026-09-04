"use client";
import { Search, MapPin, Activity, Package, Clock, Calendar, ArrowRight, Heart, MessageCircle, Share2, MoreHorizontal, Building, PartyPopper, AlertTriangle } from 'lucide-react';
import { Card, Button, Badge } from './Shared';
import Image from 'next/image';
import InteractiveFeedItem from './InteractiveFeedItem';
import { useRouter } from 'next/navigation';

export default function HomeView({ initialPosts }: { initialPosts: any[] }) {
    const router = useRouter();

    const setView = (view: string) => {
        const routes: Record<string, string> = {
            'home': '/',
            'search': '/explore',
            'booking': '/activity',
            'profile': '/profile',
            'healthcare': '/services/healthcare',
            'education': '/services/education',
            'grocery': '/services/grocery',
            'events': '/services/events',
            'rentals': '/services/rentals',
            'services': '/services/local',
            'hotel': '/services/hotel',
        };
        if (routes[view]) {
            router.push(routes[view]);
        }
    };

    // Map database posts to FeedItem props
    const feedPosts = initialPosts.map(post => {
        let avatarIcon = <Building className="w-5 h-5" />;
        let avatarColor = "bg-slate-100 text-slate-700";

        let variant: 'default' | 'emergency' | 'event' = 'default';

        if (post.organization?.type === 'HEALTHCARE') {
            avatarIcon = <Activity className="w-5 h-5" />;
            avatarColor = "bg-rose-100 text-rose-700";
        } else if (post.isEmergency) {
            avatarIcon = <AlertTriangle className="w-5 h-5" />;
            avatarColor = "bg-red-100 text-red-700";
            variant = 'emergency';
        } else if (post.category === 'COMMUNITY') {
            avatarIcon = <PartyPopper className="w-5 h-5" />;
            avatarColor = "bg-orange-100 text-orange-600";
            variant = 'event';
        }

        return {
            id: post.id,
            postId: post.id,
            author: post.organization?.name || 'Unknown',
            avatarIcon,
            avatarColor,
            time: new Date(post.createdAt).toLocaleDateString(),
            category: post.category,
            content: post.title + '\n\n' + post.content,
            actionLabel: post.isEmergency ? "View Alert" : "View Details",
            initialLikes: post.likesCount || 0,
            initialHasLiked: post.hasLiked || false,
            initialShareCount: post.shareCount || 0,
            comments: post.comments?.length || 0,
            variant
        };
    });

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Mobile Greeting - hidden on desktop where it's in the top nav/sidebar */}
            <div className="flex items-center justify-between md:hidden mb-2">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your Location</span>
                    <span className="text-sm font-bold flex items-center gap-1">Oak Ridge District <span className="text-teal-800 text-[10px] ml-1">▼</span></span>
                </div>
                <button onClick={() => setView('profile')} className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm overflow-hidden relative">
                    <div className="w-full h-full bg-teal-800 opacity-20"></div>
                </button>
            </div>

            {/* Search & Location */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-800 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search anything in your area..."
                        className="w-full bg-slate-100 rounded-xl py-3 pl-10 pr-4 text-xs border-none focus:outline-none focus:ring-2 focus:ring-teal-800 transition-all text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal"
                        onClick={() => setView('search')}
                    />
                </div>
                <Button variant="outline" className="hidden md:flex shrink-0">
                    <MapPin className="w-5 h-5" />
                    Downtown District
                </Button>
            </div>

            {/* Quick Action Chips */}
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
                {[
                    { label: "Hospital", icon: "🏥" },
                    { label: "Pharmacy", icon: "💊" },
                    { label: "School", icon: "🎓" },
                    { label: "Grocery", icon: "🛒" },
                    { label: "Delivery", icon: "📦" },
                    { label: "Events", icon: "🎉" },
                    { label: "Rentals", icon: "🚲" },
                    { label: "Services", icon: "🛠️" },
                    { label: "Hotel", icon: "🏨" },
                ].map((c) => (
                    <button 
                        key={c.label} 
                        onClick={() => {
                            if (c.label === 'Hospital' || c.label === 'Pharmacy') setView('healthcare');
                            else if (c.label === 'School') setView('education');
                            else if (c.label === 'Grocery') setView('grocery');
                            else if (c.label === 'Delivery') setView('booking');
                            else if (c.label === 'Events') setView('events');
                            else if (c.label === 'Rentals') setView('rentals');
                            else if (c.label === 'Services') setView('services');
                            else if (c.label === 'Hotel') setView('hotel');
                            else setView('search');
                        }} 
                        className="flex flex-col items-center gap-2 shrink-0 md:flex-row md:px-6 md:py-3 md:bg-white md:border md:border-slate-200 md:rounded-full md:shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                        <div className="w-16 h-16 md:w-auto md:h-auto md:bg-transparent bg-teal-50 text-teal-800 rounded-[20px] flex items-center justify-center text-2xl md:text-xl shadow-sm border border-teal-100/50 md:border-none md:shadow-none">
                            {c.icon}
                        </div>
                        <span className="text-[11px] md:text-sm font-bold text-slate-700">{c.label}</span>
                    </button>
                ))}
            </div>

            {/* Feed Header */}
            <div className="flex items-center justify-between pt-4 pb-2 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Local Feed
                </h3>
                <div className="flex gap-2">
                    <Badge variant="neutral" className="bg-slate-200 text-[10px]">Recent</Badge>
                </div>
            </div>

            {/* Feed Posts */}
            <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full pb-8">
                {feedPosts.map((post) => (
                    <InteractiveFeedItem 
                        key={post.id} 
                        {...post} 
                        onAction={() => router.push(`/post/${post.id}`)} 
                    />
                ))}
            </div>
        </div>
    )
}
