'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  MapPin,
  Image as ImageIcon,
  Globe,
  Sparkles,
  User,
  Building2,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  X,
  Ticket,
  Megaphone,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import { useCity } from '@/components/cityos/CityProvider';
import { FallbackImg, Pill } from '@/components/cityos/CityUI';
import { createUniversalEvent } from '@/lib/actions/events';
import {
  DEFAULT_EVENT_PLACEHOLDER_IMAGE,
  EVENT_CATEGORIES,
  type EventCategory,
  type EventCustomQuestion,
  type CustomFieldType,
} from '@/lib/event-utils';
import LoginModal from '@/components/LoginModal';

export default function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { city } = useCity();
  const { activeBusiness, myBusinesses } = useAccountSwitcher();

  const cityName = city?.name ?? 'Calabar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Host selection: 'PERSONAL' or an organizationId
  const [selectedHost, setSelectedHost] = useState<string>('PERSONAL');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Community & Culture');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('200');
  const [eventUrl, setEventUrl] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(true);

  // Luma-style settings & questions
  const [requireApproval, setRequireApproval] = useState(false);
  const [customConfirmationNote, setCustomConfirmationNote] = useState('');
  const [questions, setQuestions] = useState<EventCustomQuestion[]>([]);

  // Local helper state for building questions
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<CustomFieldType>('text');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Pre-select business if ?org= query parameter is present or activeBusiness is set
  useEffect(() => {
    const orgParam = searchParams?.get('org');
    if (orgParam && myBusinesses.some((b) => b.id === orgParam)) {
      setSelectedHost(orgParam);
    } else if (activeBusiness?.id) {
      setSelectedHost(activeBusiness.id);
    }
  }, [searchParams, myBusinesses, activeBusiness]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload event flyer.');
      }
      setImageUrl(data.url);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not upload image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestionLabel.trim()) return;
    const parsedOptions =
      newQuestionType === 'select'
        ? newQuestionOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newQ: EventCustomQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      required: newQuestionRequired,
      options: parsedOptions && parsedOptions.length > 0 ? parsedOptions : undefined,
    };

    setQuestions((prev) => [...prev, newQ]);
    setNewQuestionLabel('');
    setNewQuestionType('text');
    setNewQuestionRequired(false);
    setNewQuestionOptions('');
    setIsAddingQuestion(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const selectedBusiness = myBusinesses.find((b) => b.id === selectedHost);
  const hostDisplayName =
    selectedHost === 'PERSONAL'
      ? session?.user?.name || 'You (Personal Host)'
      : selectedBusiness?.name || 'Business Host';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'unauthenticated' || !session?.user) {
      setShowLoginModal(true);
      return;
    }

    if (!title.trim() || !location.trim() || !date) {
      setErrorMsg('Please fill in the event name, date & time, and venue location.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await createUniversalEvent({
        hostType: selectedHost === 'PERSONAL' ? 'PERSONAL' : 'ORGANIZATION',
        organizationId: selectedHost === 'PERSONAL' ? undefined : selectedHost,
        title: title.trim(),
        category,
        description: description.trim(),
        location: location.trim(),
        date,
        capacity: Number(capacity) || 200,
        price: isPaid ? Number(price) || 0 : 0,
        imageUrl: imageUrl.trim() || undefined,
        eventUrl: eventUrl.trim() || undefined,
        shareToFeed,
        citySlug: city?.slug,
        settings: {
          requireApproval,
          customConfirmationNote: customConfirmationNote.trim() || undefined,
          questions: questions.length > 0 ? questions : undefined,
        },
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setSubmitting(false);
        return;
      }

      if (res?.event?.id) {
        router.push(`/events/${res.event.id}`);
      } else {
        router.push('/events');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong while creating the event.');
      setSubmitting(false);
    }
  };

  const previewDateStr = (() => {
    if (!date) return 'Select Date & Time';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Select Date & Time';
    return d.toLocaleDateString('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign in to host an event"
        message={`Create and share events in ${cityName} as an individual resident or from any of your business pages.`}
      />

      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-teal-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events in {cityName}
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-black">
          <Sparkles className="w-3.5 h-3.5" /> Universal Event Creator
        </span>
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Create an Event in {cityName}
          </h1>
          <p className="mt-1.5 text-teal-100/80 text-xs md:text-[13px] font-medium leading-relaxed">
            Anyone can host — create a community meetup, house party, church programme, live band night, store launch, or city conference in seconds. No separate EventOS setup required.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-5 py-3.5 text-xs font-bold text-rose-700 flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Composer Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 md:p-7 shadow-sm space-y-6"
        >
          {/* 1. Host Switcher (Personal vs Any Business) */}
          <div className="space-y-2.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
              1. Who is hosting this event?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedHost('PERSONAL')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  selectedHost === 'PERSONAL'
                    ? 'border-teal-700 bg-teal-50/70 ring-2 ring-teal-700/15'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {session?.user?.name || 'Myself (Personal)'}
                  </p>
                  <p className="text-[10px] font-bold text-teal-700">Individual Resident Host</p>
                </div>
                {selectedHost === 'PERSONAL' && (
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                )}
              </button>

              {myBusinesses.map((biz) => (
                <button
                  key={biz.id}
                  type="button"
                  onClick={() => setSelectedHost(biz.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                    selectedHost === biz.id
                      ? 'border-teal-700 bg-teal-50/70 ring-2 ring-teal-700/15'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 truncate">{biz.name}</p>
                    <p className="text-[10px] font-bold text-slate-500 truncate">
                      Business Page ({biz.type})
                    </p>
                  </div>
                  {selectedHost === biz.id && (
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Event Cover Photo / Flyer */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                2. Event Flyer / Cover Photo
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                Uses default placeholder if left blank
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 text-teal-900 text-xs font-black transition-colors shrink-0"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading Flyer...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-teal-700" />
                    Upload Flyer from Device
                  </>
                )}
              </button>

              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste an image URL (https://...)"
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:text-rose-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3. Event Title & Category */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                3. Event Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Calabar Tech & Creators Mixer, Friday Live Band Night..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Category / Vibe
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all ${
                      category === cat
                        ? 'bg-teal-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Date/Time & Venue Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                4. Date & Start Time *
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Venue / Location in {cityName} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={`e.g., Marian Road, ${cityName} or Cultural Centre`}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>

          {/* 5. Admission & Event Link */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                5. Admission & Registration Link
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaid(false);
                    setPrice('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    !isPaid ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Free Entry
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    isPaid ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Paid Ticket
                </button>
              </div>
            </div>

            {isPaid && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Ticket / Entry Price (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Estimated Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="200"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                External Event / Registration / Ticket Link (Optional)
              </label>
              <div className="relative flex items-center">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={eventUrl}
                  onChange={(e) => setEventUrl(e.target.value)}
                  placeholder="https://tix.africa/... or Eventbrite / Instagram / Google Form link"
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                If provided, the event page will show a direct &ldquo;Go to Event&rdquo; button taking attendees straight to this link.
              </p>
            </div>
          </div>

          {/* 6. Description */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              6. Event Details & Schedule
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what to expect — schedule, special guests, dress code, or parking info..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* 7. Registration Settings & Guest Form (Luma-Style Tools) */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                  7. Registration Settings & Guest Form
                </label>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Luma-Style Tools
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Customize admissions workflow, collect attendee details, and curate your guest list.
              </p>
            </div>

            {/* Require Host Approval Toggle */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  Require Host Approval (Curated Guest List)
                </div>
                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                  Attendees will request an RSVP. You will review and approve guests before their boarding pass & ticket are issued.
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

            {/* Custom Gate Instructions / Confirmation Note */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Gate Instructions / Confirmation Note (Shown on Ticket)
              </label>
              <textarea
                rows={2}
                value={customConfirmationNote}
                onChange={(e) => setCustomConfirmationNote(e.target.value)}
                placeholder="e.g. Enter through Gate 2, mention guestlist at security, dress code is All Black..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Custom Questions List & Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700">
                  Custom Registration Questions ({questions.length})
                </label>
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
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0">
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
          </div>

          {/* 8. Auto-Share to City Newsfeed */}
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={shareToFeed}
              onChange={(e) => setShareToFeed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-teal-300 text-teal-800 focus:ring-teal-700"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-teal-950">
                <Megaphone className="w-3.5 h-3.5 text-teal-700" />
                Also announce this event on the City Newsfeed
              </div>
              <p className="text-[11px] font-medium text-teal-800/80 mt-0.5">
                Automatically publishes an event card to the {cityName} feed so residents scrolling the home feed can discover and open your event.
              </p>
            </div>
          </label>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/events"
              className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-black shadow-md transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing Event...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  Publish Event
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Live Facebook-Style Card Preview */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Live Event Preview
              </span>
              <Pill tone="teal">{category}</Pill>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
              <FallbackImg
                src={imageUrl.trim() || DEFAULT_EVENT_PLACEHOLDER_IMAGE}
                fallbackSrc={DEFAULT_EVENT_PLACEHOLDER_IMAGE}
                alt={title || 'Event Preview'}
                className="h-44 w-full object-cover"
              />
              <div className="p-4 bg-white space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Pill tone="orange">{category}</Pill>
                  <span className="text-xs font-black text-teal-800">
                    {!isPaid || !Number(price)
                      ? 'Free Entry'
                      : `₦${Number(price).toLocaleString()}`}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {title.trim() || 'Your Event Title'}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Hosted by {hostDisplayName}
                </p>
                {description.trim() && (
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed pt-1">
                    {description.trim()}
                  </p>
                )}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-700" />
                    {previewDateStr}
                  </span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span className="truncate">{location.trim() || cityName}</span>
                  </span>
                </div>

                {requireApproval && (
                  <div className="pt-2 flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Host approval required for admission
                  </div>
                )}

                {eventUrl.trim() && (
                  <div className="pt-2">
                    <span className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-800 text-white text-[11px] font-black">
                      Go to Event
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
