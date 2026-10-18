import { Suspense } from 'react';
import CreatePost from '@/components/cityos/CreatePost';

export default function CreatePostPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm font-bold text-slate-400">Loading composer...</div>}>
            <CreatePost />
        </Suspense>
    );
}