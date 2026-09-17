'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Send, ArrowRight, Bot, Car, Stethoscope } from 'lucide-react';
import {
  AI_SCRIPTS,
  getBusiness,
  getProduct,
  getProperty,
  getHotel,
  getClinic,
  fmtNaira,
  CITY_NOTES,
  DEMO_ROUTE_FARES,
} from '@/lib/demo/cityos';
import { FallbackImg, Pill, Stars, LocationRow, VerifiedBadge } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

interface Msg {
  role: 'user' | 'cityos';
  text: string;
  scriptId?: number;
}

function matchScript(q: string): number {
  const text = q.toLowerCase();
  let best = -1;
  let score = 0;
  AI_SCRIPTS.forEach((s, i) => {
    const sMatch = s.keywords.filter((k) => text.includes(k.toLowerCase())).length;
    const hasCity = text.includes('calabar') || text.includes('stadium') || text.includes('tonight');
    const total = sMatch + (hasCity ? 1 : 0);
    if (total > score) {
      score = total;
      best = i;
    }
  });
  return score >= 2 ? best : -1;
}

function ResultCards({ scriptId }: { scriptId: number }) {
  const script = AI_SCRIPTS[scriptId];
  if (!script) return null;
  return (
    <div className="mt-3 space-y-2">
      {script.results.map((r) => {
        if (r.type === 'business') {
          const b = getBusiness(r.id);
          if (!b) return null;
          return (
            <Link
              key={r.id}
              href={`/biz/${b.slug}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-teal-300 transition-colors group"
            >
              <FallbackImg src={b.logo} alt={b.name} className="w-12 h-12 rounded-lg" icon={<span className="text-sm font-black">{b.name.slice(0, 1)}</span>} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-ink truncate group-hover:text-teal-900">{b.name}</p>
                <LocationRow text={`${b.area} · ${b.category}`} className="text-[10px]" />
                <div className="flex items-center gap-2 mt-1">
                  <Stars rating={b.rating} />
                  <span className="text-[10px] font-bold text-slate-400">{`${b.reviews} reviews`}</span>
                </div>
              </div>
              <Pill tone="teal">Visit ▲</Pill>
            </Link>
          );
        }
        if (r.type === 'product') {
          const p = getProduct(r.id);
          if (!p) return null;
          const biz = getBusiness(p.bizSlug);
          return (
            <Link
              key={r.id}
              href={`/product/${p.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-teal-300 transition-colors group"
            >
              <FallbackImg src={p.image} alt={p.name} className="w-12 h-12 rounded-lg" icon={<span className="text-sm font-black">{p.name.slice(0, 1)}</span>} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-ink truncate group-hover:text-teal-900">{p.name}</p>
                <p className="text-[10px] font-bold text-slate-400">{biz?.name}</p>
                <p className="text-[13px] font-black text-teal-900 mt-0.5">{fmtNaira(p.price)}</p>
              </div>
              <Pill tone="teal">Buy ▲</Pill>
            </Link>
          );
        }
        if (r.type === 'property') {
          const hp = getProperty(r.id);
          if (!hp) return null;
          return (
            <Link
              key={r.id}
              href={`/house/${hp.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-teal-300 transition-colors group"
            >
              <FallbackImg src={hp.image} alt={hp.title} className="w-12 h-12 rounded-lg" icon={<span className="text-sm font-black">H</span>} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-ink truncate group-hover:text-teal-900">{hp.title}</p>
                <LocationRow text={`${hp.area} · ${hp.bedrooms} bed`} className="text-[10px]" />
                <p className="text-[12px] font-black text-teal-900 mt-0.5">{`${fmtNaira(hp.pricePerYear)} / yr`}</p>
              </div>
              <Pill tone="orange">CityHouse ▲</Pill>
            </Link>
          );
        }
        if (r.type === 'route') {
          const fare = DEMO_ROUTE_FARES.find((f) => f.to.toLowerCase().includes('airport'));
          return (
            <Link
              key={r.id}
              href="/drive/ride"
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-teal-300 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-ink truncate group-hover:text-teal-900">CitySolo · to the airport</p>
                <p className="text-[10px] font-bold text-slate-400">{`${fare ? fare.km : 13.6} km · ${fare ? fare.fare : 2800} naira fare`}</p>
              </div>
              <Pill tone="teal">Book ride ▲</Pill>
            </Link>
          );
        }
        if (r.type === 'hotel') {
          const h = getHotel(r.id);
          if (!h) return null;
          return (
            <Link
              key={r.id}
              href={`/stay/${h.slug}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-teal-300 transition-colors group"
            >
              <FallbackImg src={h.image} alt={h.name} className="w-12 h-12 rounded-lg" icon={<span className="text-sm font-black">H</span>} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-ink truncate group-hover:text-teal-900">{h.name}</p>
                <LocationRow text={`${h.address} · ${h.area}`} className="text-[10px]" />
                <div className="flex items-center gap-2 mt-1">
                  <Stars rating={h.rating} />
                  <span className="text-[10px] font-bold text-slate-400">{`${h.roomsLeft} rooms left`}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[12px] font-black text-teal-900">{fmtNaira(h.pricePerNight)}</p>
                <p className="text-[9px] font-bold text-slate-400">/ night</p>
              </div>
            </Link>
          );
        }
        if (r.type === 'clinic') {
          const c = getClinic(r.id);
          if (!c) return null;
          return (
            <Link
              key={r.id}
              href={`/care/${c.slug}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-teal-300 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-ink truncate group-hover:text-teal-900">{c.name}</p>
                <LocationRow text={`${c.area} · ${c.tagline}`} className="text-[10px]" />
                <p className="text-[10px] font-bold text-slate-400">{`${c.hours} · free consults`}</p>
              </div>
              <Pill tone="teal">Book visit ▲</Pill>
            </Link>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function CityAI() {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [msgs, typing]);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || typing) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    setTyping(true);
    window.setTimeout(() => {
      const idx = matchScript(text);
      setMsgs((m) => [
        ...m,
        {
          role: 'cityos',
          text:
            idx >= 0
              ? AI_SCRIPTS[idx].answer
              : "I searched Calabar for that and it isn't in my demo brief yet. Try one of the sample prompts below — or ask about a room under ₦10,000 tonight, fresh ogbono, a party tray, a ride to the airport, or a clinic consult.",
          scriptId: idx >= 0 ? idx : undefined,
        },
      ]);
      setTyping(false);
    }, 850);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center shadow-md shadow-brand-800/20">
          <Sparkles className="w-5 h-5" />
        </span>
        <div>
          <h1 className="text-xl font-black text-ink">Ask CityOS</h1>
          <p className="text-xs text-slate-500 font-medium">Your city, one question away</p>
        </div>
        <Pill tone="blue" className="ml-auto">Demo logic</Pill>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(6,95,70,0.06)] overflow-hidden">
        <div ref={scrollRef} className="h-[46vh] md:h-[52vh] overflow-y-auto p-5 space-y-4">
          {msgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-800 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-teal-800/20">
                  <Sparkles className="w-8 h-8" />
                </div>
                <span className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-black">
                  AI
                </span>
              </div>
              <p className="text-sm font-black text-ink">What do you need in Calabar right now?</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {`I know the city's places, prices and people — markets, rooms, rides, lessons. My answers are scripted demo logic for this prototype.`}
              </p>
            </div>
          ) : (
            msgs.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] bg-teal-800 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] font-medium leading-relaxed">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 text-[13px] text-slate-700 leading-relaxed">
                      <p className="font-bold text-ink mb-1.5 flex items-center gap-2 text-xs">
                        CityOS Assistant
                        <VerifiedBadge label="Demo" />
                      </p>
                      {m.text}
                      {typeof m.scriptId === 'number' ? <ResultCards scriptId={m.scriptId} /> : null}
                      {typeof m.scriptId === 'number' ? (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {AI_SCRIPTS[m.scriptId].followUps.map((f) => (
                            <button
                              key={f}
                              onClick={() => ask(f)}
                              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-teal-800 hover:border-teal-300 transition-colors"
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ),
            )
          )}
          {typing ? (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 p-3 bg-white">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask(input)}
                placeholder={CITY_NOTES.aiPlaceholder}
                className="w-full bg-slate-50 rounded-xl pl-4 pr-4 py-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 ring-brand-200 placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => ask(input)}
              disabled={!input.trim() || typing}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center disabled:opacity-40 transition-all hover:shadow-md"
            >
              <Send className="w-4 h-4 -translate-x-px" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pt-2.5 [&::-webkit-scrollbar]:hidden">
            {AI_SCRIPTS.map((s) => (
              <button
                key={s.question}
                onClick={() => ask(s.question)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-50 text-brand-900 ring-1 ring-brand-100 text-[11px] font-bold hover:bg-brand-100 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                {s.question.split(' ').slice(0, 6).join(' ').replace(/^/, '')}
                <ArrowRight className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center font-medium">
        {`Ask CityOS is a scripted demo — it answers from a fixed Calabar dataset, not a live model.`}
      </p>
    </div>
  );
}