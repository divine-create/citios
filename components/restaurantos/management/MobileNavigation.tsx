'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function MobileNavigation({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu when the pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <h2 className="text-lg font-black text-slate-900">Dashboard</h2>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsOpen(false)}>
          <div 
            className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl transition-transform transform translate-x-0" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full w-full relative">
              <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-2 text-slate-500 bg-slate-100 rounded-full z-50">
                <X size={16} />
              </button>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
