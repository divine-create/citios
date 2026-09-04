'use client';
import BookingView from '@/components/BookingView';
import { useRouter } from 'next/navigation';

export default function ActivityPage() {
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
        };
        if (routes[view]) router.push(routes[view]);
    };
    return <BookingView setView={setView} />;
}
