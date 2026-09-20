'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { getMyBusinesses } from '@/lib/actions/business';

export interface BusinessAccount {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  address?: string | null;
  cityId?: string | null;
  citySlug?: string | null;
  cityName?: string | null;
  role: string;
  workspaceUrl: string;
}

export interface AccountSwitcherContextType {
  myBusinesses: BusinessAccount[];
  activeBusiness: BusinessAccount | null;
  isPersonal: boolean;
  isLoading: boolean;
  isCreateModalOpen: boolean;
  openCreateModal: (defaultType?: string) => void;
  closeCreateModal: () => void;
  preselectedType: string | null;
  refreshBusinesses: () => Promise<BusinessAccount[]>;
  switchToBusiness: (business: BusinessAccount) => void;
  switchToPersonal: () => void;
}

const STORAGE_KEY = 'cityconnect_active_business_id';

const AccountSwitcherContext = createContext<AccountSwitcherContextType>({
  myBusinesses: [],
  activeBusiness: null,
  isPersonal: true,
  isLoading: false,
  isCreateModalOpen: false,
  openCreateModal: () => {},
  closeCreateModal: () => {},
  preselectedType: null,
  refreshBusinesses: async () => [],
  switchToBusiness: () => {},
  switchToPersonal: () => {},
});

export function AccountSwitcherProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [myBusinesses, setMyBusinesses] = useState<BusinessAccount[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<BusinessAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | null>(null);

  const refreshBusinesses = useCallback(async () => {
    if (!session?.user?.personId) {
      setMyBusinesses([]);
      setActiveBusiness(null);
      return [];
    }

    try {
      setIsLoading(true);
      const list = await getMyBusinesses();
      setMyBusinesses(list);

      // Check current URL first to match workspace org id
      const workspaceMatch = pathname?.match(/\/workspaces\/[^/]+\/([^/?#]+)/);
      const urlOrgId = workspaceMatch ? workspaceMatch[1] : null;

      if (urlOrgId) {
        const found = list.find((b) => b.id === urlOrgId);
        if (found) {
          setActiveBusiness(found);
          try {
            localStorage.setItem(STORAGE_KEY, found.id);
          } catch {}
          return list;
        }
      }

      // Check localStorage for previously selected business
      try {
        const storedId = localStorage.getItem(STORAGE_KEY);
        if (storedId) {
          const match = list.find((b) => b.id === storedId);
          if (match) {
            setActiveBusiness(match);
            return list;
          }
        }
      } catch {}

      return list;
    } catch (err) {
      console.error('Failed to load businesses:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.personId, pathname]);

  // Initial fetch when session is available
  useEffect(() => {
    refreshBusinesses();
  }, [refreshBusinesses]);

  // Sync active business with route changes if entering a workspace
  useEffect(() => {
    if (!pathname || myBusinesses.length === 0) return;
    const workspaceMatch = pathname.match(/\/workspaces\/[^/]+\/([^/?#]+)/);
    if (workspaceMatch) {
      const orgId = workspaceMatch[1];
      const match = myBusinesses.find((b) => b.id === orgId);
      if (match && activeBusiness?.id !== match.id) {
        setActiveBusiness(match);
        try {
          localStorage.setItem(STORAGE_KEY, match.id);
        } catch {}
      }
    }
  }, [pathname, myBusinesses, activeBusiness?.id]);

  const switchToBusiness = useCallback(
    (business: BusinessAccount) => {
      setActiveBusiness(business);
      try {
        localStorage.setItem(STORAGE_KEY, business.id);
      } catch {}
      router.push(business.workspaceUrl);
    },
    [router]
  );

  const switchToPersonal = useCallback(() => {
    setActiveBusiness(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    // If currently inside a business workspace, navigate back to home feed
    if (pathname?.startsWith('/workspaces/') || pathname?.startsWith('/admin/')) {
      router.push('/');
    }
  }, [pathname, router]);

  const openCreateModal = useCallback((defaultType?: string) => {
    setPreselectedType(defaultType || null);
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setPreselectedType(null);
  }, []);

  return (
    <AccountSwitcherContext.Provider
      value={{
        myBusinesses,
        activeBusiness,
        isPersonal: !activeBusiness,
        isLoading,
        isCreateModalOpen,
        openCreateModal,
        closeCreateModal,
        preselectedType,
        refreshBusinesses,
        switchToBusiness,
        switchToPersonal,
      }}
    >
      {children}
    </AccountSwitcherContext.Provider>
  );
}

export function useAccountSwitcher() {
  return useContext(AccountSwitcherContext);
}
