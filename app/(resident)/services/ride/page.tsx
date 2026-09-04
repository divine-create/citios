'use client';
import { CityRideView } from '@/components/VerticalViews';
import { useRouter } from 'next/navigation';

export default function CityRidePage() {
    const router = useRouter();
    const setView = (view: string) => {
        const routes: Record<string, string> = {
            'home': '/',
            'search': '/explore',
            'booking': '/activity',
            'profile': '/profile',
            'hotel': '/services/hotel',
            'healthcare': '/services/healthcare',
            'education': '/services/education',
            'grocery': '/services/grocery',
            'events': '/services/events',
            'rentals': '/services/rentals',
            'services': '/services/local',
            'ride': '/services/ride',
        };
        if (routes[view]) router.push(routes[view]);
    };
    return <CityRideView setView={setView} />;
}
