
import PostView from '@/components/PostView';
import { getPostDetails } from '@/lib/actions/post';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await getPostDetails(id);
    return <PostView post={post} />;
}
