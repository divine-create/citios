"use client";

import React, { useState } from "react";
import { MessageSquare, Mail, Calendar, User, Search, Inbox, ChevronRight } from "lucide-react";

export default function InquiriesManager({ inquiries }: { inquiries: any[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(inquiries[0]?.id || null);
  const [search, setSearch] = useState("");

  const filtered = inquiries.filter(
    (inq) =>
      inq.name.toLowerCase().includes(search.toLowerCase()) ||
      inq.email.toLowerCase().includes(search.toLowerCase()) ||
      inq.message.toLowerCase().includes(search.toLowerCase())
  );

  const selected = filtered.find((i) => i.id === selectedId) || filtered[0];

  if (inquiries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-slate-400 p-8">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <MessageSquare size={32} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No Inquiries Yet</h2>
        <p className="text-center max-w-sm">When someone submits a message through your public website's contact form, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white w-full">
      {/* Left Sidebar - List */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Inbox size={20} className="text-blue-600" /> Inbox <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full">{inquiries.length}</span>
          </h2>
          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No matches found.</div>
          ) : (
            filtered.map((inq) => {
              const isSelected = selected?.id === inq.id;
              return (
                <button
                  key={inq.id}
                  onClick={() => setSelectedId(inq.id)}
                  className={`w-full text-left p-4 border-b border-slate-100 transition-colors ${
                    isSelected ? "bg-blue-50/80 border-blue-100 relative" : "hover:bg-slate-100/50 bg-white"
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={`font-semibold truncate pr-2 ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                      {inq.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {new Date(inq.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate mb-1.5">{inq.email}</div>
                  <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{inq.message}</div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Detail */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {selected ? (
          <>
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selected.name}</h3>
                  <a href={`mailto:${selected.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 mt-0.5">
                    <Mail size={14} /> {selected.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <Calendar size={14} />
                {new Date(selected.createdAt).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-3xl">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Message Content</h4>
                <div className="prose prose-slate max-w-none">
                  <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-[15px]">
                    {selected.message}
                  </p>
                </div>
                
                <div className="mt-12 pt-6 border-t border-slate-100">
                  <a 
                    href={`mailto:${selected.email}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Reply via Email
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50/50">
            Select a message to view
          </div>
        )}
      </div>
    </div>
  );
}
