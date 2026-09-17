'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { fmtNaira, type ActivityItem, type FeedPost } from '@/lib/demo/cityos';
import { getJob } from '@/lib/demo/universe/jobs';
import { seedState, getAccount } from './seed';
import type {
  DemoAccount,
  DemoState,
  SavedItem,
  AppOrder,
  ServiceRequest,
  EventRegistration,
  AppReview,
} from './types';

const STORAGE_KEY = 'cityos-demo-app';
const LEGACY_CREATED = 'cityos-demo-created-posts';
const LEGACY_SAVED = 'cityos-demo-saved';

interface PlaceOrderInput {
  ref: string;
  orgId: string;
  merchant: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: AppOrder['status'];
  method: string;
}

interface RequestServiceInput {
  orgId?: string;
  taskId: string;
  taskName: string;
  area: string;
  amount: number;
  pro: string;
  status: ServiceRequest['status'];
}

interface RegisterEventInput {
  eventId: string;
  title: string;
  host: string;
  orgId?: string;
  ref: string;
  amount: number;
}

interface DemoAppCtx {
  hydrated: boolean;
  state: DemoState;
  activeAccount: DemoAccount;
  setAccount: (id: string) => void;
  reset: () => void;

  follows: string[];
  isFollowing: (orgId: string) => boolean;
  toggleFollow: (orgId: string) => void;

  likedPosts: string[];
  isLiked: (postId: string) => boolean;
  toggleLike: (postId: string) => void;

  createdPosts: FeedPost[];
  createPost: (post: FeedPost) => void;

  saved: SavedItem[];
  isSaved: (kind: SavedItem['kind'], id: string) => boolean;
  toggleSave: (item: SavedItem) => void;
  savedOf: (kind: SavedItem['kind']) => SavedItem[];

  orders: AppOrder[];
  placeOrder: (o: PlaceOrderInput) => void;
  ordersForOrg: (orgId: string) => AppOrder[];

  serviceRequests: ServiceRequest[];
  requestService: (r: RequestServiceInput) => void;
  requestsForOrg: (orgId: string) => ServiceRequest[];

  jobApps: string[];
  isApplied: (jobId: string) => boolean;
  applyJob: (jobId: string) => void;
  appsForOrg: (orgId: string) => { jobId: string; title: string; at: string }[];

  eventRegs: EventRegistration[];
  isRegistered: (eventId: string) => boolean;
  registerEvent: (r: RegisterEventInput) => void;
  regsForOrg: (orgId: string) => EventRegistration[];

  reviews: AppReview[];
  addReview: (r: { orgId: string; rating: number; text: string }) => void;
  reviewsForOrg: (orgId: string) => AppReview[];

  activity: ActivityItem[];
  activityForOrg: (orgId: string) => ActivityItem[];
}

const DemoContext = createContext<DemoAppCtx | null>(null);

export function DemoAppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(seedState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      let next: DemoState | null = null;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<DemoState>;
          if (parsed && typeof parsed === 'object') {
            next = {
              ...seedState(),
              ...parsed,
              follows: Array.isArray(parsed.follows) ? parsed.follows : [],
              likedPosts: Array.isArray(parsed.likedPosts) ? parsed.likedPosts : [],
              saved: Array.isArray(parsed.saved) ? parsed.saved : [],
              orders: Array.isArray(parsed.orders) ? parsed.orders : [],
              serviceRequests: Array.isArray(parsed.serviceRequests) ? parsed.serviceRequests : [],
              jobApps: Array.isArray(parsed.jobApps) ? parsed.jobApps : [],
              eventRegs: Array.isArray(parsed.eventRegs) ? parsed.eventRegs : [],
              reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
              createdPosts: Array.isArray(parsed.createdPosts) ? parsed.createdPosts : [],
            };
          }
        }

        // Migration: fold legacy created-posts + saved before losing them.
        if (!next) {
          next = seedState();
          try {
            const rawPosts = window.localStorage.getItem(LEGACY_CREATED);
            if (rawPosts) {
              const posts = JSON.parse(rawPosts) as FeedPost[];
              if (Array.isArray(posts)) next.createdPosts = posts;
            }
            const rawSaved = window.localStorage.getItem(LEGACY_SAVED);
            if (rawSaved) {
              const data = JSON.parse(rawSaved) as Record<string, string[]>;
              const items: SavedItem[] = [];
              if (Array.isArray(data.biz)) items.push(...data.biz.map((id) => ({ kind: 'biz' as const, id })));
              if (Array.isArray(data.products)) items.push(...data.products.map((id) => ({ kind: 'product' as const, id })));
              if (Array.isArray(data.jobs)) items.push(...data.jobs.map((id) => ({ kind: 'job' as const, id })));
              if (Array.isArray(data.events)) items.push(...data.events.map((id) => ({ kind: 'event' as const, id })));
              if (Array.isArray(data.places)) items.push(...data.places.map((id) => ({ kind: 'place' as const, id })));
              if (items.length) next.saved = items;
            }
          } catch {
            /* ignore migration errors */
          }
        }

        setState(next);
        window.setTimeout(() => setHydrated(true), 0);
      } catch {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const activeAccount = useMemo(() => getAccount(state.activeAccountId), [state.activeAccountId]);

  const setAccount = useCallback((id: string) => {
    setState((s) => ({ ...s, activeAccountId: id }));
  }, []);

  const reset = useCallback(() => {
    setState(seedState());
    try {
      window.localStorage.removeItem(LEGACY_CREATED);
      window.localStorage.removeItem(LEGACY_SAVED);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const isFollowing = useCallback((orgId: string) => state.follows.includes(orgId), [state.follows]);
  const toggleFollow = useCallback((orgId: string) => {
    setState((s) => ({
      ...s,
      follows: s.follows.includes(orgId) ? s.follows.filter((f) => f !== orgId) : [...s.follows, orgId],
    }));
  }, []);

  const isLiked = useCallback((postId: string) => state.likedPosts.includes(postId), [state.likedPosts]);
  const toggleLike = useCallback((postId: string) => {
    setState((s) => ({
      ...s,
      likedPosts: s.likedPosts.includes(postId) ? s.likedPosts.filter((p) => p !== postId) : [...s.likedPosts, postId],
    }));
  }, []);

  const createPost = useCallback((post: FeedPost) => {
    setState((s) => ({ ...s, createdPosts: [post, ...s.createdPosts] }));
  }, []);

  const isSaved = useCallback(
    (kind: SavedItem['kind'], id: string) => state.saved.some((x) => x.kind === kind && x.id === id),
    [state.saved],
  );
  const toggleSave = useCallback((item: SavedItem) => {
    setState((s) => {
      const existing = s.saved.some((x) => x.kind === item.kind && x.id === item.id);
      return {
        ...s,
        saved: existing ? s.saved.filter((x) => !(x.kind === item.kind && x.id === item.id)) : [item, ...s.saved],
      };
    });
  }, []);
  const savedOf = useCallback(
    (kind: SavedItem['kind']) => state.saved.filter((x) => x.kind === kind),
    [state.saved],
  );

  const placeOrder = useCallback((o: PlaceOrderInput) => {
    const now = Date.now();
    setState((s) => {
      const order: AppOrder = {
        id: `ord-${now}`,
        ref: o.ref,
        orgId: o.orgId,
        merchant: o.merchant,
        items: o.items,
        total: o.total,
        status: o.status,
        method: o.method,
        time: 'Just now',
        ts: now,
      };
      return { ...s, orders: [order, ...s.orders] };
    });
  }, []);
  const ordersForOrg = useCallback(
    (orgId: string) => state.orders.filter((o) => o.orgId === orgId),
    [state.orders],
  );

  const requestService = useCallback((r: RequestServiceInput) => {
    const now = Date.now();
    setState((s) => {
      const req: ServiceRequest = {
        id: `req-${now}`,
        orgId: r.orgId,
        taskId: r.taskId,
        taskName: r.taskName,
        area: r.area,
        amount: r.amount,
        pro: r.pro,
        status: r.status,
        time: 'Just now',
        ts: now,
      };
      return { ...s, serviceRequests: [req, ...s.serviceRequests] };
    });
  }, []);
  const requestsForOrg = useCallback(
    (orgId: string) => state.serviceRequests.filter((r) => r.orgId === orgId),
    [state.serviceRequests],
  );

  const isApplied = useCallback((jobId: string) => state.jobApps.includes(jobId), [state.jobApps]);
  const applyJob = useCallback((jobId: string) => {
    setState((s) => (s.jobApps.includes(jobId) ? s : { ...s, jobApps: [jobId, ...s.jobApps] }));
  }, []);
  const appsForOrg = useCallback(
    (orgId: string) =>
      state.jobApps
        .map((jobId) => {
          const job = getJob(jobId);
          if (!job || job.orgId !== orgId) return null;
          return { jobId, title: job.title, at: 'just now' };
        })
        .filter((x): x is { jobId: string; title: string; at: string } => Boolean(x)),
    [state.jobApps],
  );

  const isRegistered = useCallback((eventId: string) => state.eventRegs.some((r) => r.eventId === eventId), [state.eventRegs]);
  const registerEvent = useCallback((r: RegisterEventInput) => {
    const now = Date.now();
    setState((s) => {
      const reg: EventRegistration = {
        id: `reg-${now}`,
        eventId: r.eventId,
        title: r.title,
        host: r.host,
        orgId: r.orgId,
        ref: r.ref,
        amount: r.amount,
        time: 'Just now',
        ts: now,
      };
      return { ...s, eventRegs: s.eventRegs.some((x) => x.eventId === r.eventId) ? s.eventRegs : [reg, ...s.eventRegs] };
    });
  }, []);
  const regsForOrg = useCallback(
    (orgId: string) => state.eventRegs.filter((r) => r.orgId === orgId),
    [state.eventRegs],
  );

  const addReview = useCallback((r: { orgId: string; rating: number; text: string }) => {
    const now = Date.now();
    setState((s) => {
      const review: AppReview = {
        id: `rev-${now}`,
        orgId: r.orgId,
        author: getAccount(s.activeAccountId).name,
        rating: r.rating,
        text: r.text,
        time: 'Just now',
        ts: now,
      };
      return { ...s, reviews: [review, ...s.reviews] };
    });
  }, []);
  const reviewsForOrg = useCallback(
    (orgId: string) => state.reviews.filter((r) => r.orgId === orgId),
    [state.reviews],
  );

  const activityList = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    let i = 0;
    for (const o of state.orders) {
      items.push({
        id: `${o.id}-a`,
        kind: 'order',
        title: `Order ${o.ref} confirmed`,
        body: `${o.merchant} · ${fmtNaira(o.total)} · ${o.method === 'wallet' ? 'paid with CityPay' : o.method}`,
        time: o.time,
        href: '/activity',
      });
    }
    for (const r of state.serviceRequests) {
      items.push({
        id: `${r.id}-a`,
        kind: 'service',
        title: 'Service request submitted',
        body: `${r.taskName} · from ${fmtNaira(r.amount)} around ${r.area}`,
        time: r.time,
        href: '/tasks',
      });
    }
    for (const jobId of state.jobApps) {
      const job = getJob(jobId);
      if (!job) continue;
      items.push({
        id: `${jobId}-a`,
        kind: 'job',
        title: 'Application sent',
        body: `${job.title} · ${job.orgName}`,
        time: 'Just now',
        href: `/jobs/${job.id}`,
      });
    }
    for (const reg of state.eventRegs) {
      items.push({
        id: `${reg.id}-a`,
        kind: 'event',
        title: reg.amount > 0 ? 'Ticket reserved' : 'Spot reserved',
        body: `${reg.title} · entry ${reg.amount > 0 ? fmtNaira(reg.amount) : 'free'}`,
        time: reg.time,
        href: `/events/${reg.eventId}`,
      });
    }
    for (const rev of state.reviews) {
      items.push({
        id: `${rev.id}-a`,
        kind: 'service',
        title: 'Review posted',
        body: `${rev.author} rated a business ${rev.rating}/5`,
        time: rev.time,
        href: '/activity',
      });
    }
    return items;
  }, [state]);

  const activityForOrg = useCallback(
    (orgId: string): ActivityItem[] => {
      const items: ActivityItem[] = [];
      for (const o of state.orders) {
        if (o.orgId !== orgId) continue;
        items.push({ id: `${o.id}-orga`, kind: 'order', title: `New order ${o.ref}`, body: `${o.merchant} · ${o.items.length} items · ${fmtNaira(o.total)}`, time: o.time, href: '/activity' });
      }
      for (const r of state.serviceRequests) {
        if (r.orgId !== orgId) continue;
        items.push({ id: `${r.id}-orga`, kind: 'service', title: 'Service request', body: `${r.taskName} · from ${fmtNaira(r.amount)}`, time: r.time, href: '/tasks' });
      }
      for (const reg of state.eventRegs) {
        if (reg.orgId !== orgId) continue;
        items.push({ id: `${reg.id}-orga`, kind: 'event', title: 'New registration', body: `${reg.title} · ${reg.ref}`, time: reg.time, href: `/events/${reg.eventId}` });
      }
      return items;
    },
    [state],
  );

  const value = useMemo<DemoAppCtx>(
    () => ({
      hydrated,
      state,
      activeAccount,
      setAccount,
      reset,
      follows: state.follows,
      isFollowing,
      toggleFollow,
      likedPosts: state.likedPosts,
      isLiked,
      toggleLike,
      createdPosts: state.createdPosts,
      createPost,
      saved: state.saved,
      isSaved,
      toggleSave,
      savedOf,
      orders: state.orders,
      placeOrder,
      ordersForOrg,
      serviceRequests: state.serviceRequests,
      requestService,
      requestsForOrg,
      jobApps: state.jobApps,
      isApplied,
      applyJob,
      appsForOrg,
      eventRegs: state.eventRegs,
      isRegistered,
      registerEvent,
      regsForOrg,
      reviews: state.reviews,
      addReview,
      reviewsForOrg,
      activity: activityList,
      activityForOrg,
    }),
    [
      hydrated,
      state,
      activeAccount,
      setAccount,
      reset,
      isFollowing,
      toggleFollow,
      isLiked,
      toggleLike,
      createPost,
      isSaved,
      toggleSave,
      savedOf,
      placeOrder,
      ordersForOrg,
      requestService,
      requestsForOrg,
      isApplied,
      applyJob,
      appsForOrg,
      isRegistered,
      registerEvent,
      regsForOrg,
      addReview,
      reviewsForOrg,
      activityList,
      activityForOrg,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoApp(): DemoAppCtx {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoApp must be used within DemoAppProvider');
  return ctx;
}