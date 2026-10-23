"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Users, 
  Ticket, 
  TrendingUp, 
  Settings, 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Mail, 
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  QrCode,
  ExternalLink,
  Trash2,
  Save,
  Check,
  X,
  Loader2,
  Share2,
  Copy,
  Download,
  Smartphone,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Globe,
  Link2
} from 'lucide-react';
import { 
  approveEventRegistration, 
  declineEventRegistration, 
  updateEventSettings,
  checkInTicket,
  createTicketTier
} from '@/lib/actions/events';
import type { EventCustomQuestion, CustomFieldType, EventSettings } from '@/lib/event-utils';

interface OrganizerDashboardProps {
  event: any;
  ticketTiers: any[];
  tickets: any[];
  registrations?: any[];
  persons: any[];
  events?: any[];
}

export default function OrganizerDashboard({ 
  event, 
  ticketTiers = [], 
  tickets = [], 
  registrations = [], 
  persons = [],
  events = []
}: OrganizerDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'attendees' | 'analytics' | 'tickets' | 'checkin' | 'settings'>('attendees');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendeeFilter, setAttendeeFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN'>('ALL');

  // Share & Registration link states
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Local state for registrations & tickets to provide instant UI updates
  const [localRegistrations, setLocalRegistrations] = useState(registrations);
  const [localTickets, setLocalTickets] = useState(tickets);
  const [localTicketTiers, setLocalTicketTiers] = useState(ticketTiers);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Door Check-in tab state
  const [checkinCodeInput, setCheckinCodeInput] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinFeedback, setCheckinFeedback] = useState<{
    success?: boolean;
    error?: string;
    attendeeName?: string;
    type?: string;
  } | null>(null);

  // Add Ticket Tier modal state
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('5000');
  const [tierCapacity, setTierCapacity] = useState('50');
  const [savingTier, setSavingTier] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  // Settings tab state
  const initialSettings: EventSettings = event.settings || {};
  const [requireApproval, setRequireApproval] = useState<boolean>(!!initialSettings.requireApproval);
  const [customConfirmationNote, setCustomConfirmationNote] = useState<string>(initialSettings.customConfirmationNote || '');
  const [capacity, setCapacity] = useState<number>(event.capacity || 200);
  const [externalEventUrl, setExternalEventUrl] = useState<string>(event.eventUrl || '');
  const [questions, setQuestions] = useState<EventCustomQuestion[]>(initialSettings.questions || []);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // Subform for adding questions in settings tab
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<CustomFieldType>('text');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState('');

  // Computations
  const publicRegistrationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${event.id}`
    : `https://citios.vercel.app/events/${event.id}`;

  const validTickets = localTickets.filter(t => t.status === 'VALID' || t.status === 'SCANNED');
  
  const totalRevenue = validTickets.reduce((acc, ticket) => {
    const tier = localTicketTiers.find(tier => tier.id === ticket.tierId);
    return acc + (tier?.price || 0);
  }, 0);

  const confirmedRsvps = localRegistrations.filter(r => r.status === 'REGISTERED' || r.status === 'CHECKED_IN').length;
  const pendingApprovalsCount = localRegistrations.filter(r => r.status === 'PENDING_APPROVAL').length;
  const totalCheckedIn = localRegistrations.filter(r => r.status === 'CHECKED_IN').length + localTickets.filter(t => t.status === 'SCANNED').length;
  const totalAttendeesCount = validTickets.length + confirmedRsvps;
  const maxCapacity = event.capacity || 200;

  // Unify registrations and tickets into a single attendee CRM
  const attendeesList: Array<{
    id: string;
    registrationId?: string;
    ticketId?: string;
    personId?: string;
    name: string;
    email: string;
    phone: string;
    tier: string;
    date: string;
    status: 'Checked In' | 'Confirmed' | 'Pending Approval' | 'Waitlisted' | 'Declined';
    rawStatus: string;
    type: 'TICKET' | 'RSVP';
    checkinCode: string;
  }> = [];

  const processedPersonIds = new Set<string>();

  for (const reg of localRegistrations) {
    const person = persons.find(p => p.id === reg.personId);
    processedPersonIds.add(reg.personId);
    const relatedTicket = localTickets.find(t => t.eventId === event.id && t.personId === reg.personId);

    let displayStatus: 'Checked In' | 'Confirmed' | 'Pending Approval' | 'Waitlisted' | 'Declined' = 'Confirmed';
    if (reg.status === 'CHECKED_IN' || relatedTicket?.status === 'SCANNED') {
      displayStatus = 'Checked In';
    } else if (reg.status === 'PENDING_APPROVAL') {
      displayStatus = 'Pending Approval';
    } else if (reg.status === 'WAITLISTED') {
      displayStatus = 'Waitlisted';
    } else if (reg.status === 'DECLINED') {
      displayStatus = 'Declined';
    } else {
      displayStatus = 'Confirmed';
    }

    const shortCode = (relatedTicket?.id || reg.id).slice(-6).toUpperCase();

    attendeesList.push({
      id: reg.id,
      registrationId: reg.id,
      ticketId: relatedTicket?.id,
      personId: reg.personId,
      name: person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : 'Guest Attendee',
      email: person?.email || '',
      phone: person?.phone || '',
      tier: 'Free RSVP',
      date: new Date(reg.createdAt || Date.now()).toLocaleDateString(),
      status: displayStatus,
      rawStatus: reg.status,
      type: 'RSVP',
      checkinCode: shortCode
    });
  }

  for (const ticket of localTickets) {
    if (processedPersonIds.has(ticket.personId)) continue;
    const person = persons.find(p => p.id === ticket.personId);
    const tier = localTicketTiers.find(t => t.id === ticket.tierId);
    const shortCode = ticket.id.slice(-6).toUpperCase();

    attendeesList.push({
      id: ticket.id,
      ticketId: ticket.id,
      personId: ticket.personId,
      name: person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : 'Ticket Holder',
      email: person?.email || '',
      phone: person?.phone || '',
      tier: tier?.name || 'General Admission',
      date: new Date(ticket.createdAt || Date.now()).toLocaleDateString(),
      status: ticket.status === 'SCANNED' ? 'Checked In' : 'Confirmed',
      rawStatus: ticket.status,
      type: 'TICKET',
      checkinCode: shortCode
    });
  }

  const filteredAttendees = attendeesList.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.checkinCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (attendeeFilter === 'PENDING') return a.status === 'Pending Approval';
    if (attendeeFilter === 'CONFIRMED') return a.status === 'Confirmed';
    if (attendeeFilter === 'CHECKED_IN') return a.status === 'Checked In';
    return true;
  });

  const ticketTiersWithSold = localTicketTiers.map(tier => {
    const sold = validTickets.filter(t => t.tierId === tier.id).length;
    return {
      ...tier,
      sold,
      status: sold >= tier.capacity ? 'Sold Out' : 'On Sale'
    };
  });

  // Action Handlers
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicRegistrationUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // Fallback
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Join us at ${event.title}!\nDate: ${event.date ? new Date(event.date).toLocaleDateString() : 'Upcoming'}\nVenue: ${event.location || 'Calabar'}\n\nRegister / Grab Tickets here: ${publicRegistrationUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportCsv = () => {
    const headers = ['Name', 'Email', 'Phone', 'Admission Type', 'Status', 'Code', 'Date Added'];
    const rows = attendeesList.map(a => [
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.email.replace(/"/g, '""')}"`,
      `"${a.phone.replace(/"/g, '""')}"`,
      `"${a.tier.replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${a.checkinCode}"`,
      `"${a.date}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const cleanTitle = (event.title || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `${cleanTitle}_Attendees_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApprove = async (registrationId: string) => {
    setActionLoadingId(registrationId);
    try {
      const res = await approveEventRegistration({ registrationId, eventId: event.id });
      if (res?.success) {
        setLocalRegistrations(prev => 
          prev.map(r => r.id === registrationId ? { ...r, status: 'REGISTERED' } : r)
        );
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (registrationId: string) => {
    setActionLoadingId(registrationId);
    try {
      const res = await declineEventRegistration({ registrationId, eventId: event.id });
      if (res?.success) {
        setLocalRegistrations(prev => 
          prev.map(r => r.id === registrationId ? { ...r, status: 'DECLINED' } : r)
        );
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickCheckIn = async (codeToVerify?: string) => {
    const code = (codeToVerify || checkinCodeInput).trim();
    if (!code) return;

    setCheckinLoading(true);
    setCheckinFeedback(null);
    try {
      const res = await checkInTicket({
        eventId: event.id,
        codeOrId: code
      });

      if ('error' in res && res.error) {
        setCheckinFeedback({ error: res.error });
      } else if ('success' in res && res.success) {
        setCheckinFeedback({
          success: true,
          attendeeName: res.attendeeName,
          type: res.type
        });
        setCheckinCodeInput('');

        // Update local status for matching attendee
        const cleanCode = code.replace(/^(TKT|RSVP)-/i, '').toLowerCase();
        setLocalRegistrations(prev => 
          prev.map(r => r.id.toLowerCase().replace(/-/g, '').startsWith(cleanCode) || r.id === code ? { ...r, status: 'CHECKED_IN' } : r)
        );
        setLocalTickets(prev => 
          prev.map(t => t.id.toLowerCase().replace(/-/g, '').startsWith(cleanCode) || t.id === code ? { ...t, status: 'SCANNED' } : t)
        );
      }
    } catch (err: any) {
      setCheckinFeedback({ error: err.message || 'Check-in failed.' });
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) return;

    setSavingTier(true);
    setTierError(null);
    try {
      const res = await createTicketTier({
        eventId: event.id,
        name: tierName.trim(),
        price: Number(tierPrice) || 0,
        capacity: Number(tierCapacity) || 50,
      });

      if ('error' in res && res.error) {
        setTierError(res.error);
      } else if ('tier' in res && res.tier) {
        setLocalTicketTiers(prev => [...prev, res.tier]);
        setShowAddTierModal(false);
        setTierName('');
        setTierPrice('5000');
        setTierCapacity('50');
      }
    } catch (err: any) {
      setTierError(err.message || 'Failed to create tier');
    } finally {
      setSavingTier(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestionLabel.trim()) return;
    const parsedOptions = newQuestionType === 'select'
      ? newQuestionOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const newQ: EventCustomQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      required: newQuestionRequired,
      options: parsedOptions && parsedOptions.length > 0 ? parsedOptions : undefined,
    };

    setQuestions(prev => [...prev, newQ]);
    setNewQuestionLabel('');
    setNewQuestionType('text');
    setNewQuestionRequired(false);
    setNewQuestionOptions('');
    setIsAddingQuestion(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSavedSuccess(false);
    try {
      const res = await updateEventSettings({
        eventId: event.id,
        capacity: Number(capacity) || 200,
        eventUrl: externalEventUrl.trim() || null,
        settings: {
          requireApproval,
          customConfirmationNote: customConfirmationNote.trim() || undefined,
          questions: questions.length > 0 ? questions : undefined,
        }
      });
      if (res?.success) {
        setSettingsSavedSuccess(true);
        setTimeout(() => setSettingsSavedSuccess(false), 3500);
      }
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-teal-800 font-bold mb-1.5 uppercase tracking-wider">
              <span>CityOS Events</span>
              <span>&bull;</span>
              <span>EventOS Management Suite</span>
              {events.length > 1 && (
                <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {events.length} Events Active
                </span>
              )}
            </div>

            {/* Event Title or Multi-Event Dropdown Selector */}
            {events.length > 1 ? (
              <div className="flex items-center gap-3">
                <select
                  value={event.id}
                  onChange={(e) => router.push(`/events/organizer?event=${e.target.value}`)}
                  className="text-xl md:text-2xl font-black text-slate-900 bg-transparent border-b-2 border-teal-700 focus:outline-none cursor-pointer py-1 pr-6"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({new Date(ev.date || Date.now()).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                {event.title || 'Event Dashboard'}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-500 text-xs font-semibold">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-700" /> 
                {event.date ? new Date(event.date).toLocaleDateString() : 'Date TBD'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-700" /> 
                {event.location || 'Location TBD'}
              </span>
              {requireApproval && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                  Approval Required
                </span>
              )}
              {event.eventUrl && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                  <Globe className="w-3 h-3 text-indigo-600" />
                  Custom Registration Active
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/events/${event.id}`}
              target="_blank"
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              Public Page
            </Link>
            <button
              type="button"
              onClick={() => setActiveTab('checkin')}
              className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-black hover:bg-teal-900 transition flex items-center gap-1.5 shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              Door Check-in
            </button>
          </div>
        </div>

        {/* Quick Registration & Share Toolbar */}
        <div className="max-w-6xl mx-auto mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-teal-50/50 p-3.5 rounded-2xl border border-teal-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-teal-600 text-white rounded-lg shrink-0">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
                Attendee Registration Link
              </span>
              <span className="text-xs font-mono font-medium text-slate-700 truncate block">
                {publicRegistrationUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-teal-200 hover:bg-teal-50 text-teal-900 text-xs font-black transition-colors shadow-xs"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-teal-700" />
                  Copy Link
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-colors shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Code
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto pb-px">
          <button 
            onClick={() => setActiveTab('attendees')}
            className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'attendees' ? 'border-teal-800 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Attendees & Guest List
            {pendingApprovalsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {pendingApprovalsCount} Pending
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'analytics' ? 'border-teal-800 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Admissions
          </button>
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'tickets' ? 'border-teal-800 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Ticket className="w-4 h-4" />
            Ticket Tiers
          </button>
          <button 
            onClick={() => setActiveTab('checkin')}
            className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'checkin' ? 'border-teal-800 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Door Check-in & Scanner
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'settings' ? 'border-teal-800 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            Registration Form & Settings
          </button>
        </div>

        {/* Tab 1: Attendees & Guest List (Luma Style CRM) */}
        {activeTab === 'attendees' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAttendeeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    attendeeFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All ({attendeesList.length})
                </button>
                {pendingApprovalsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAttendeeFilter('PENDING')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      attendeeFilter === 'PENDING'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    Pending Review ({pendingApprovalsCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAttendeeFilter('CONFIRMED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    attendeeFilter === 'CONFIRMED'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Confirmed ({confirmedRsvps + validTickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendeeFilter('CHECKED_IN')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    attendeeFilter === 'CHECKED_IN'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Checked In ({totalCheckedIn})
                </button>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by name, email, code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs shrink-0"
                  title="Export Attendees to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Attendee</th>
                      <th className="px-5 py-3.5">Admission Type</th>
                      <th className="px-5 py-3.5">Code</th>
                      <th className="px-5 py-3.5">Date Added</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendees.length > 0 ? (
                      filteredAttendees.map((attendee) => (
                        <tr key={attendee.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{attendee.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {attendee.email || attendee.phone || 'No direct contact'}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                              {attendee.tier}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 text-[11px]">
                              {attendee.checkinCode}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium">
                            {attendee.date}
                          </td>
                          <td className="px-5 py-3.5">
                            {attendee.status === 'Checked In' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Checked In
                              </span>
                            )}
                            {attendee.status === 'Confirmed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-[10px] font-black border border-teal-200">
                                <Check className="w-3 h-3 text-teal-600" />
                                Confirmed
                              </span>
                            )}
                            {attendee.status === 'Pending Approval' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Needs Approval
                              </span>
                            )}
                            {attendee.status === 'Waitlisted' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-black border border-indigo-200">
                                Waitlisted
                              </span>
                            )}
                            {attendee.status === 'Declined' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-[10px] font-black border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Declined
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {attendee.status === 'Pending Approval' && attendee.registrationId ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApprove(attendee.registrationId!)}
                                  disabled={actionLoadingId === attendee.registrationId}
                                  className="px-2.5 py-1 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-xs transition"
                                >
                                  {actionLoadingId === attendee.registrationId ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDecline(attendee.registrationId!)}
                                  disabled={actionLoadingId === attendee.registrationId}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-[11px] inline-flex items-center gap-1 transition"
                                >
                                  <X className="w-3 h-3" />
                                  Decline
                                </button>
                              </div>
                            ) : attendee.status === 'Confirmed' ? (
                              <button
                                type="button"
                                onClick={() => handleQuickCheckIn(attendee.ticketId || attendee.registrationId)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1 transition"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Check In
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                          No attendees found matching &quot;{searchQuery}&quot;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Analytics & Admissions */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Paid Tiers</span>
                </div>
                <h3 className="text-slate-500 text-xs font-bold">Total Revenue</h3>
                <p className="text-2xl font-black text-slate-900 mt-1">₦{totalRevenue.toLocaleString()}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Confirmed</span>
                </div>
                <h3 className="text-slate-500 text-xs font-bold">Admissions / RSVPs</h3>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {totalAttendeesCount} <span className="text-slate-400 text-sm font-semibold">/ {maxCapacity}</span>
                </p>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div 
                    className="bg-teal-700 h-1.5 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, (totalAttendeesCount / maxCapacity) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Door Gate</span>
                </div>
                <h3 className="text-slate-500 text-xs font-bold">Checked In at Door</h3>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalCheckedIn}</p>
                <p className="text-[10px] font-bold text-emerald-700 mt-1">
                  {totalAttendeesCount > 0 ? Math.round((totalCheckedIn / totalAttendeesCount) * 100) : 0}% turnout
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Curation</span>
                </div>
                <h3 className="text-slate-500 text-xs font-bold">Pending Review</h3>
                <p className="text-2xl font-black text-slate-900 mt-1">{pendingApprovalsCount}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Awaiting host approval</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900">Admissions Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400">Free RSVPs</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{confirmedRsvps}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400">Paid Tier Tickets</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{validTickets.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400">Remaining Venue Capacity</p>
                  <p className="text-lg font-black text-teal-800 mt-0.5">
                    {Math.max(0, maxCapacity - totalAttendeesCount)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Ticket Tiers */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-black text-slate-900">Manage Ticket Tiers</h2>
                <p className="text-xs text-slate-500 font-medium">Configure admission pricing, tier quotas, and VIP allocations.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTierModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Ticket Tier
              </button>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Tier Name</th>
                      <th className="px-5 py-3.5">Price</th>
                      <th className="px-5 py-3.5">Sold / Capacity</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">Free Resident RSVP</td>
                      <td className="px-5 py-3.5 font-bold text-teal-700">Free (₦0)</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600">
                        {confirmedRsvps} <span className="text-slate-400">/ {maxCapacity}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                    {ticketTiersWithSold.map(tier => (
                      <tr key={tier.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{tier.name}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">₦{tier.price.toLocaleString()}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600">
                          {tier.sold} <span className="text-slate-400">/ {tier.capacity}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            tier.status === 'Sold Out' 
                              ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {tier.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Door Check-in & Scanner */}
        {activeTab === 'checkin' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-base font-black text-slate-900">Door Check-in & Gate Scanner</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Admit attendees at the entrance using 6-character code verification or full mobile optical camera scanning.
                </p>
              </div>
              <Link
                href={`/events/scanner?event=${event.id}`}
                target="_blank"
                className="px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm shrink-0"
              >
                <Smartphone className="w-4 h-4" />
                Launch Full Camera Scanner
              </Link>
            </div>

            {/* Quick 6-char Code Entry Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Quick Ticket / RSVP Code Verification
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter 6-char code or full ticket ID (e.g. 5A9F1B)"
                  value={checkinCodeInput}
                  onChange={(e) => setCheckinCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickCheckIn();
                  }}
                  className="flex-1 font-mono uppercase tracking-widest text-sm font-black px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => handleQuickCheckIn()}
                  disabled={checkinLoading || !checkinCodeInput.trim()}
                  className="px-6 py-3 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm shrink-0"
                >
                  {checkinLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Verify & Admit
                </button>
              </div>

              {/* Feedback Alert */}
              {checkinFeedback && (
                <div className={`p-4 rounded-xl text-xs font-bold border transition-all ${
                  checkinFeedback.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {checkinFeedback.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Admitted Successfully! <strong>{checkinFeedback.attendeeName}</strong> has been checked in ({checkinFeedback.type}).
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{checkinFeedback.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fast 1-Click Check In Guestlist */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Fast Guest Search & 1-Click Check In</h3>
                  <p className="text-xs text-slate-500">Tap Check In next to any arriving guest on the roster.</p>
                </div>
                <span className="text-xs font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  {totalCheckedIn} / {totalAttendeesCount} Checked In
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Filter guest roster by name, email, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {filteredAttendees.filter(a => a.status === 'Confirmed' || a.status === 'Checked In').map(attendee => (
                  <div key={attendee.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">{attendee.name}</span>
                        <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                          {attendee.checkinCode}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">{attendee.email || attendee.phone || attendee.tier}</span>
                    </div>

                    <div>
                      {attendee.status === 'Checked In' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Admitted
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickCheckIn(attendee.ticketId || attendee.registrationId)}
                          className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-black text-xs inline-flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Registration Form & Settings (Luma Tools) */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-7 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900">Registration Form & Host Settings</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Configure direct registration links, approvals, gate notes, guest questionnaires, and venue capacity.
              </p>
            </div>

            {settingsSavedSuccess && (
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                Settings saved successfully!
              </div>
            )}

            {/* Registration & Share Links Section */}
            <div className="p-5 rounded-2xl border border-teal-200 bg-teal-50/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-teal-900">
                <Link2 className="w-4 h-4 text-teal-700" />
                Public Registration & External Registration Link
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                CityOS provides a direct instant-RSVP page for this event. You can also specify an external or custom registration portal (e.g. Luma, Eventbrite, or your custom ticketing domain).
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    CityOS Public Registration URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicRegistrationUrl}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono text-slate-700 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shrink-0 shadow-xs flex items-center gap-1.5"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      {linkCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Custom / External Registration URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://lu.ma/your-event or https://yourdomain.com/tickets"
                    value={externalEventUrl}
                    onChange={(e) => setExternalEventUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    When provided, attendees viewing your event page will see a prominent &quot;Register on Official Portal&quot; button linking directly to this URL.
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Curated Guest List (Host Approval) */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  Require Host Approval (Curated Guest List)
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed max-w-xl">
                  When enabled, attendees will request an RSVP and enter a &quot;Needs Approval&quot; state. You review and approve/decline guests before their boarding pass & ticket are issued.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequireApproval(!requireApproval)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  requireApproval ? 'bg-teal-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    requireApproval ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Venue Capacity */}
            <div className="max-w-xs">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Total Venue Capacity
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            {/* 3. Gate Instructions */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Gate Instructions / Confirmation Note
              </label>
              <textarea
                rows={3}
                value={customConfirmationNote}
                onChange={(e) => setCustomConfirmationNote(e.target.value)}
                placeholder="e.g. Enter through Gate 2, mention guestlist at security, dress code is All Black..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                This note appears on the attendee&apos;s boarding pass ticket and confirmation screen.
              </p>
            </div>

            {/* 4. Custom Registration Questions */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-black text-slate-900">
                    Registration Questions ({questions.length})
                  </label>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Collect relevant info from guests when they register (e.g., job title, company, dietary preferences).
                  </p>
                </div>
                {!isAddingQuestion && (
                  <button
                    type="button"
                    onClick={() => setIsAddingQuestion(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 text-xs font-black hover:bg-teal-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                )}
              </div>

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-900 flex items-center justify-center text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{q.label}</p>
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 mt-0.5">
                            <span className="capitalize">{q.type}</span>
                            {q.required && <span className="text-rose-600 font-bold">• Required</span>}
                            {q.options && <span>• {q.options.length} options</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Question Subform */}
              {isAddingQuestion && (
                <div className="p-4 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-900">New Registration Question</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingQuestion(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Question Label *
                      </label>
                      <input
                        type="text"
                        value={newQuestionLabel}
                        onChange={(e) => setNewQuestionLabel(e.target.value)}
                        placeholder="e.g. What company or project are you working on?"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Response Type
                        </label>
                        <select
                          value={newQuestionType}
                          onChange={(e) => setNewQuestionType(e.target.value as CustomFieldType)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          <option value="text">Short Text</option>
                          <option value="textarea">Long Text / Paragraph</option>
                          <option value="select">Dropdown Choices</option>
                          <option value="checkbox">Yes / No Confirmation</option>
                          <option value="social">Social Handle / Link</option>
                        </select>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newQuestionRequired}
                            onChange={(e) => setNewQuestionRequired(e.target.checked)}
                            className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                          />
                          <span className="text-xs font-bold text-slate-700">Required question</span>
                        </label>
                      </div>
                    </div>

                    {newQuestionType === 'select' && (
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Options (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={newQuestionOptions}
                          onChange={(e) => setNewQuestionOptions(e.target.value)}
                          placeholder="e.g. Founder, Developer, Designer, Student, Investor"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        disabled={!newQuestionLabel.trim()}
                        className="px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 disabled:opacity-50 shadow-sm"
                      >
                        Add to Form
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-md transition disabled:opacity-50"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Settings...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-teal-800">
                Registration QR Code
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(publicRegistrationUrl)}`}
                alt="Event Registration QR"
                className="w-56 h-56 mx-auto rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-sm">{event.title}</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Guests can scan this code with their smartphone camera to instantly open the registration page and RSVP.
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-3 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                {linkCopied ? 'Copied Link!' : 'Copy Link'}
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ticket Tier Modal */}
      {showAddTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900">Add New Ticket Tier</h3>
              <button
                type="button"
                onClick={() => setShowAddTierModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tierError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {tierError}
              </div>
            )}

            <form onSubmit={handleCreateTier} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Tier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Access, Early Bird, Backstage Pass"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Price (₦) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Ticket Allocation *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={tierCapacity}
                    onChange={(e) => setTierCapacity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTierModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTier || !tierName.trim()}
                  className="px-5 py-2 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 disabled:opacity-50 transition shadow-sm inline-flex items-center gap-1.5"
                >
                  {savingTier ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
