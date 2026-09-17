'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, MapPin, Heart, MessageCircle, UserPlus, Check } from 'lucide-react';
import { getCommunity } from '@/lib/demo/universe/orgs';
import { SectionHead, Pill, DemoBanner } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

export default function CityCommunityDetail({ id }: { id: string }) {
  const community = getCommunity(id);
  const [joined, setJoined] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  if (!community) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">👥</p>
        <h1 className="text-lg font-black text-ink">No circle with that name.</h1>
        <Link href="/community" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to communities
        </Link>
      </div>
    );
  }

  const toggleLike = (pid: string) => setLiked((m) => ({ ...m, [pid]: !m[pid] }));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/community" className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-500 hover:text-teal-800 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All communities
      </Link>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-56 h-56 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone="teal">{`${community.members.toLocaleString()} members`}</Pill>
            <Pill tone="orange">{`since ${community.established}`}</Pill>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-100/80">
              <MapPin className="w-3 h-3" /> {community.area}
            </span>
          </div>
          <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">{community.name}</h1>
          <p className="mt-2 text-teal-50/85 text-[13px] font-medium max-w-2xl leading-relaxed">{community.about}</p>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setJoined((j) => !j)}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition-colors',
                joined ? 'bg-emerald-500 text-white' : 'bg-white text-teal-950 hover:bg-teal-50',
              )}
            >
              {joined ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {joined ? 'Member (demo)' : 'Join circle'}
            </button>
            <span className="text-[11px] font-bold text-teal-100/80">{`Admin · ${community.admin}`}</span>
          </div>
        </div>
      </div>

      <section>
        <SectionHead title="The board" sub="Residents post, the circle decides. Demo data, real vibes." />
        <div className="space-y-3">
          {community.posts.map((p) => {
            const likes = p.likes + (liked[p.id] ? 1 : 0);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    {p.author.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-ink">{p.author}</p>
                    <p className="text-[10px] font-bold text-slate-400">{p.time}</p>
                  </div>
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed mt-3">{p.body}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => toggleLike(p.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ring-1 transition-colors',
                      liked[p.id] ? 'bg-orange-50 text-orange-600 ring-orange-200' : 'bg-white text-slate-500 ring-slate-200 hover:ring-teal-300',
                    )}
                  >
                    <Heart className={cn('w-3.5 h-3.5', liked[p.id] && 'fill-orange-500')} />
                    {likes}
                  </button>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-500 bg-white ring-1 ring-slate-200">
                    <MessageCircle className="w-3.5 h-3.5" /> Reply
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-2xl bg-white border border-slate-100 p-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black text-ink">Circles live on the map too</p>
          <p className="text-[11px] font-bold text-slate-400">Open the City Map and find this community pinned in its neighbourhood.</p>
        </div>
        <Link href="/map" className="text-[11px] font-black text-teal-800 hover:underline shrink-0">Open map</Link>
      </div>

      <DemoBanner />
    </div>
  );
}