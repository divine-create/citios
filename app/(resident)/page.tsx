import HomeView from '@/components/HomeView';
import { getCommunityFeed } from '@/lib/actions/feed';

export default async function HomePage() {
    const posts = await getCommunityFeed();
    
    return <HomeView initialPosts={posts} />;
}
