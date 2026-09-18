'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot } from 'lucide-react';
import { Pill } from '@/components/cityos/CityUI';
import { VerifiedBadge } from '@/components/cityos/CityUI';

interface Msg {
  role: 'user' | 'cityos';
  text: string;
}

const SUGGESTIONS = [
  'What can you help with?',
  'Find fresh produce near me',
];

/**
 * Ask CityOS. The scripted demo assistant that answered from fabricated
 * Calabar datasets was removed with the demo purge. Until a real assistant
 * is wired to canonical search surfaces, this answers honestly and points
 * residents at the live surfaces that do exist.
 */
export default function CityAI() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [msgs, typing]);

  const answer = (q: string): string => {
    const text = q.toLowerCase();
    if (/hi|hello|hey|help|what can/.test(text)) {
      return "I'm not a live assistant yet — I can't search the city in real time. Today you can browse markets in CityMart, food in CityFood, homes in CityHouse and more from the home screen. A real assistant over CityOS data is coming.";
    }
    return "I can't answer that yet — I'm not connected to live city data. Explore CityMart, CityFood, CityHouse and the feed for what's actually on CityOS right now.";
  };

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || typing) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    setTyping(true);
    window.setTimeout(() => {
      setMsgs((m) => [...m, { role: 'cityos', text: answer(text) }]);
      setTyping(false);
    }, 500);
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
        <Pill tone="slate" className="ml-auto">Preview</Pill>
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
              <p className="text-sm font-black text-ink">What do you need in the city right now?</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                The live assistant isn&apos;t connected yet — ask away and I&apos;ll tell you honestly
                where to find things on CityOS today.
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
                        <VerifiedBadge label="Preview" />
                      </p>
                      {m.text}
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
                placeholder="Ask CityOS…"
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
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-50 text-brand-900 ring-1 ring-brand-100 text-[11px] font-bold hover:bg-brand-100 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center font-medium">
        Ask CityOS is a preview — it is not connected to live city data yet.
      </p>
    </div>
  );
}
