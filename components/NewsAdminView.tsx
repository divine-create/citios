'use client';

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Shared';
import { Badge } from '@/components/Shared';
import { Button } from '@/components/Shared';

export function NewsAdminView({ initialData }: { initialData: any }) {
    const { organization, posts } = initialData;
    const [activeTab, setActiveTab] = useState<'published' | 'drafts' | 'analytics'>('published');

    const publishedPosts = posts.filter((p: any) => p.status === 'PUBLISHED');
    const draftedPosts = posts.filter((p: any) => p.status === 'DRAFT' || p.status === 'REVIEW');
    const totalViews = publishedPosts.reduce((acc: number, p: any) => acc + p.viewCount, 0);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-bl-full -z-0" />
                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">{organization.name}</h2>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Publisher CMS Portal</p>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 border-t border-slate-800 pt-8">
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{publishedPosts.length}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">Published Articles</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{draftedPosts.length}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">In Draft / Review</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{totalViews.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">Total Page Views</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto">
                <div className="flex space-x-8 min-w-max">
                    <button onClick={() => setActiveTab('published')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Published</button>
                    <button onClick={() => setActiveTab('drafts')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Drafts & Review</button>
                    <button onClick={() => setActiveTab('analytics')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Audience Analytics</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
                {activeTab === 'published' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Published Articles</h3>
                            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold">Write Article</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {publishedPosts.map((post: any) => (
                                <Card key={post.id} className="p-6 flex flex-col justify-between ">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className="text-xs font-bold">{post.category}</Badge>
                                            {post.isEmergency && <Badge className="bg-red-500 text-white font-bold uppercase text-xs">Emergency Alert</Badge>}
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 mb-2">{post.title}</h3>
                                        <p className="text-sm text-slate-600 line-clamp-3">{post.content}</p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-4 text-sm">
                                        <div className="flex items-center gap-4 text-slate-500 font-medium">
                                            <span>👀 {post.viewCount.toLocaleString()} views</span>
                                            <span>💬 {post.comments.length} comments</span>
                                        </div>
                                        <Button variant="outline" size="sm" className="bg-white border-slate-200">Edit</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'drafts' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Drafts & In Review</h3>
                            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold">Write Article</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {draftedPosts.map((post: any) => (
                                <Card key={post.id} className="p-6 flex flex-col justify-between opacity-80">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className="text-xs font-bold">{post.category}</Badge>
                                            <Badge className="bg-amber-100 text-amber-800 font-bold uppercase text-xs border-amber-200">{post.status}</Badge>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 mb-2">{post.title}</h3>
                                        <p className="text-sm text-slate-600 line-clamp-2">{post.content}</p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-4 text-sm">
                                        <span className="text-slate-500 font-medium">Last edited {new Date(post.createdAt).toLocaleDateString()}</span>
                                        <Button size="sm" className="bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold">Continue Editing</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-6 animate-in fade-in duration-300 flex items-center justify-center py-20">
                        <div className="text-center">
                            <p className="text-4xl mb-4">📈</p>
                            <h3 className="text-xl font-bold text-slate-900">Analytics Dashboard</h3>
                            <p className="text-slate-500 mt-2 max-w-md">Connect to Google Analytics or Mixpanel to view detailed read-through rates and audience demographics by city district.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
