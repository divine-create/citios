"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  QrCode, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Scan, 
  Check, 
  ArrowLeft,
  Loader2,
  XCircle,
  Ticket as TicketIcon
} from 'lucide-react';
import { checkInTicket } from '@/lib/actions/events';

interface ScannerAppProps {
  event: any;
  tickets: any[];
  registrations?: any[];
  persons: any[];
  events?: any[];
}

export default function ScannerApp({ 
  event, 
  tickets = [], 
  registrations = [], 
  persons = [], 
  events = [] 
}: ScannerAppProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'scan' | 'list'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Input code state for manual entry or hardware scanner
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    attendeeName?: string;
    type?: string;
  } | null>(null);
  const [processingScan, setProcessingScan] = useState(false);

  // Local state for tickets and registrations
  const [localTickets, setLocalTickets] = useState(tickets);
  const [localRegistrations, setLocalRegistrations] = useState(registrations);

  const capacity = event?.capacity || 200;

  // Unify attendees across tickets and registrations
  const attendeesList: Array<{
    id: string;
    code: string;
    name: string;
    email: string;
    type: string;
    status: 'checked-in' | 'pending';
    rawStatus: string;
    recordType: 'TICKET' | 'RSVP';
  }> = [];

  const processedPersonIds = new Set<string>();

  for (const reg of localRegistrations) {
    const person = persons.find(p => p.id === reg.personId);
    processedPersonIds.add(reg.personId);
    const relatedTicket = localTickets.find(t => t.eventId === event.id && t.personId === reg.personId);

    const isCheckedIn = reg.status === 'CHECKED_IN' || relatedTicket?.status === 'SCANNED';

    attendeesList.push({
      id: reg.id,
      code: reg.id.substring(0, 8).toUpperCase(),
      name: person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : 'Guest Attendee',
      email: person?.email || person?.phone || '',
      type: 'Free RSVP',
      status: isCheckedIn ? 'checked-in' : 'pending',
      rawStatus: reg.status,
      recordType: 'RSVP'
    });
  }

  for (const ticket of localTickets) {
    if (processedPersonIds.has(ticket.personId)) continue;
    const person = persons.find(p => p.id === ticket.personId);

    attendeesList.push({
      id: ticket.id,
      code: ticket.id.substring(0, 8).toUpperCase(),
      name: person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : 'Ticket Holder',
      email: person?.email || person?.phone || '',
      type: ticket.tier?.name || 'General Admission',
      status: ticket.status === 'SCANNED' ? 'checked-in' : 'pending',
      rawStatus: ticket.status,
      recordType: 'TICKET'
    });
  }

  const checkedInCount = attendeesList.filter(a => a.status === 'checked-in').length;

  const handleProcessCode = async (codeToVerify: string) => {
    const code = codeToVerify.trim();
    if (!code) return;

    setProcessingScan(true);
    setScanResult(null);

    try {
      const res = await checkInTicket({
        eventId: event.id,
        rawCode: code,
      });

      if (res?.error) {
        setScanResult({
          success: false,
          message: res.error,
        });
      } else if (res?.success) {
        setScanResult({
          success: true,
          message: `Admitted: ${res.attendeeName} (${res.type})`,
          attendeeName: res.attendeeName,
          type: res.type,
        });

        // Update local state
        setLocalTickets(prev =>
          prev.map(t =>
            t.id === code || t.id.toLowerCase().startsWith(code.toLowerCase())
              ? { ...t, status: 'SCANNED' }
              : t
          )
        );
        setLocalRegistrations(prev =>
          prev.map(r =>
            r.id === code || r.id.toLowerCase().startsWith(code.toLowerCase())
              ? { ...r, status: 'CHECKED_IN' }
              : r
          )
        );
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err?.message || 'Check-in validation failed.',
      });
    } finally {
      setProcessingScan(false);
      setScanCodeInput('');
    }
  };

  const filteredAttendees = attendeesList.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-950 border-b border-zinc-850 gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/organizer?event=${event.id}`}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
            title="Back to Organizer Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
              Door Gate Scanner
            </span>
            {events.length > 1 ? (
              <select
                value={event.id}
                onChange={(e) => router.push(`/events/scanner?event=${e.target.value}`)}
                className="text-base font-black text-white bg-transparent border-none focus:outline-none cursor-pointer pr-4"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-zinc-900 text-white">
                    {ev.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-base font-black text-white truncate max-w-xs sm:max-w-md">
                {event.title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center space-x-2 bg-zinc-900 px-3.5 py-1.5 rounded-full border border-zinc-800">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-black">
              {checkedInCount} / {capacity}
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold">Checked In</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {activeTab === 'scan' ? (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-black relative overflow-y-auto">
            <div className="w-full max-w-sm flex flex-col items-center space-y-5">
              
              {/* Scan result notification banner */}
              {scanResult && (
                <div
                  className={`w-full p-4 rounded-2xl flex items-start gap-3 border transition-all animate-in zoom-in-95 duration-300 ${
                    scanResult.success
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                  }`}
                >
                  {scanResult.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black">{scanResult.message}</p>
                    {scanResult.success && (
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        Pass verified & validated successfully.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Scanner Graphic Frame */}
              <div className="w-64 h-64 border-2 border-emerald-500/70 rounded-3xl flex items-center justify-center relative overflow-hidden bg-zinc-950/80 backdrop-blur-sm shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                <div className="absolute inset-0 border-t-2 border-emerald-400/50 animate-[ping_3s_ease-in-out_infinite]" />
                <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(52,211,153,1)]" />
                
                <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                
                <QrCode className="w-20 h-20 text-emerald-500/40" />
              </div>
              
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black text-white">Scanner Active</h2>
                <p className="text-zinc-400 text-xs px-2">
                  Point camera at attendee QR code or type their 8-character pass code below.
                </p>
              </div>

              {/* Code manual entry / barcode reader input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessCode(scanCodeInput);
                }}
                className="w-full flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Enter Pass ID or Scan Code..."
                  value={scanCodeInput}
                  onChange={(e) => setScanCodeInput(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-750 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-zinc-500 uppercase tracking-wider"
                />
                <button
                  type="submit"
                  disabled={processingScan || !scanCodeInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-black text-xs transition disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  {processingScan ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Check In
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-black">
            {/* Search Attendee List */}
            <div className="p-4 border-b border-zinc-850 bg-zinc-950">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by name, email, or pass code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-zinc-500"
                />
              </div>
            </div>
            
            {/* Attendee Roster */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredAttendees.length > 0 ? (
                filteredAttendees.map((attendee) => (
                  <div 
                    key={attendee.id} 
                    className="flex items-center justify-between p-3.5 bg-zinc-900 rounded-2xl border border-zinc-800"
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <span className="text-sm font-bold text-white truncate">{attendee.name}</span>
                      <div className="flex items-center space-x-2 mt-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {attendee.type}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          #{attendee.code}
                        </span>
                        {attendee.status === 'checked-in' && (
                          <span className="text-[10px] text-emerald-400 flex items-center font-bold">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Checked In
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {attendee.status === 'pending' ? (
                      <button
                        onClick={() => handleProcessCode(attendee.id)}
                        disabled={processingScan}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-1 shrink-0 shadow-lg shadow-emerald-950/30 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Check In
                      </button>
                    ) : (
                      <span className="bg-zinc-800/80 text-zinc-500 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border border-zinc-800">
                        Admitted
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-2">
                  <AlertTriangle className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-bold">No attendees found</p>
                  <p className="text-xs text-zinc-600">Try a different search query</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Switcher */}
      <div className="flex items-center p-2 bg-zinc-950 border-t border-zinc-850">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-colors ${
            activeTab === 'scan' ? 'text-emerald-400 bg-emerald-950/30' : 'text-zinc-500 hover:bg-zinc-900'
          }`}
        >
          <Scan className="w-5 h-5 mb-1" />
          <span className="text-[11px] font-bold">Camera & Scan</span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-colors ${
            activeTab === 'list' ? 'text-emerald-400 bg-emerald-950/30' : 'text-zinc-500 hover:bg-zinc-900'
          }`}
        >
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[11px] font-bold">Attendee List ({attendeesList.length})</span>
        </button>
      </div>
    </div>
  );
}
