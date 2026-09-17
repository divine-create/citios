'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export const EXPERIENCE_STORAGE_KEY = 'cityos-demo-experience';

export interface ExperienceCtx {
  experience: string;
  setExperience: (id: string) => void;
}

const Ctx = createContext<ExperienceCtx>({
  experience: 'resident',
  setExperience: () => {},
});

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [experience, setExperienceState] = useState('resident');

  useEffect(() => {
    const t = window.setTimeout(() => {
      const v = window.localStorage.getItem(EXPERIENCE_STORAGE_KEY);
      if (v) setExperienceState(v);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const setExperience = useCallback((id: string) => {
    setExperienceState(id);
    try {
      window.localStorage.setItem(EXPERIENCE_STORAGE_KEY, id);
    } catch {
      /* demo only */
    }
  }, []);

  return <Ctx.Provider value={{ experience, setExperience }}>{children}</Ctx.Provider>;
}

export function useExperience(): ExperienceCtx {
  return useContext(Ctx);
}