import { fetchSinglePost } from '@/app/actions/newsfeed';
import { notFound } from 'next/navigation';
import PostDetailClient from './PostDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = await fetchSinglePost(postId);
  if (!post) return { title: 'Post not found' };
  return {
    title: `${post.author} on CityConnect`,
    description: post.body.slice(0, 160),
    openGraph: {
      images: post.image ? [post.image] : [],
    },
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = await fetchSinglePost(postId);
  if (!post) notFound();
  return <PostDetailClient post={post} />;
}
