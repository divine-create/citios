import fs from 'fs';

const code = `'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateRestaurantOSSettings } from '@/lib/actions/restaurantos';
import { Button } from '@/components/ui';
import { Layers, SlidersHorizontal, BookOpen, PackageSearch, Percent, ChefHat, Check } from 'lucide-react';

const CAPABILITIES = [
  {
    id: 'enableVariants',
    title: 'Variants',
    description: 'Offer different sizes or styles of the same menu item (e.g., Small, Medium, Large).',
    icon: <Layers className="text-blue-500" size={24} />,
    color: 'bg-blue-50 border-blue-100',
  },
  {
    id: 'enableModifiers',
    title: 'Modifiers',
    description: 'Customize menu items with add-ons, choices, and extras (e.g., Extra Cheese, Toppings).',
    icon: <SlidersHorizontal className="text-indigo-500" size={24} />,
    color: 'bg-indigo-50 border-indigo-100',
  },
  {
    id: 'enableInventory',
    title: 'Inventory',
    description: 'Track stock levels, low-stock warnings, and raw material value.',
    icon: <PackageSearch className="text-amber-500" size={24} />,
    color: 'bg-amber-50 border-amber-100',
  },
  {
    id: 'enableRecipes',
    title: 'Recipes',
    description: 'Track how menu items are prepared and what ingredients they consume from inventory.',
    icon: <BookOpen className="text-emerald-500" size={24} />,
    color: 'bg-emerald-50 border-emerald-100',
    requires: ['enableInventory'],
  },
  {
    id: 'enableProduction',
    title: 'Production Runs',
    description: 'Batch-produce finished goods from raw materials before service (e.g., prep sauce).',
    icon: <ChefHat className="text-orange-500" size={24} />,
    color: 'bg-orange-50 border-orange-100',
    requires: ['enableInventory', 'enableRecipes'],
  },
  {
    id: 'enableFoodCosting',
    title: 'Food Costing',
    description: 'Understand ingredient costs, menu margins, and theoretical profitability.',
    icon: <Percent className="text-rose-500" size={24} />,
    color: 'bg-rose-50 border-rose-100',
    requires: ['enableInventory', 'enableRecipes'],
  }
];

export default function CapabilityManager({ organizationId, initialSettings }: { organizationId: string; initialSettings: any }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings || {});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const toggleCapability = async (id: string, currentValue: boolean) => {
    setIsUpdating(id);
    try {
      const newValue = !currentValue;
      const updates: any = { [id]: newValue };
      
      // Enforce dependencies: if enabling a capability that requires others, enable them too.
      if (newValue) {
        const cap = CAPABILITIES.find(c => c.id === id);
        if (cap?.requires) {
          for (const req of cap.requires) {
            updates[req] = true;
          }
        }
      } else {
        // If disabling, disable any capabilities that require this one
        for (const cap of CAPABILITIES) {
          if (cap.requires?.includes(id)) {
            updates[cap.id] = false;
          }
        }
      }

      const res = await updateRestaurantOSSettings(organizationId, updates);
      if (res?.error) {
        alert(res.error);
      } else {
        setSettings({ ...settings, ...updates });
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {CAPABILITIES.map((cap) => {
        const isEnabled = settings[cap.id];
        
        return (
          <div key={cap.id} className={\`p-6 rounded-2xl border \${isEnabled ? cap.color : 'bg-white border-slate-200'} transition-all\`}>
            <div className="flex items-start justify-between mb-4">
              <div className={\`w-12 h-12 rounded-xl flex items-center justify-center \${isEnabled ? 'bg-white/80' : 'bg-slate-100'}\`}>
                {cap.icon}
              </div>
              {isEnabled && (
                <div className="flex items-center gap-1 text-[11px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                  <Check size={12} /> Enabled
                </div>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-900">{cap.title}</h3>
            <p className="text-sm text-slate-500 mt-2 mb-6 h-10">{cap.description}</p>
            
            <Button 
              variant={isEnabled ? 'outline' : 'primary'}
              className="w-full"
              isLoading={isUpdating === cap.id}
              onClick={() => toggleCapability(cap.id, isEnabled)}
            >
              {isEnabled ? 'Disable' : 'Enable Capability'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
`;

fs.writeFileSync('components/restaurantos/management/CapabilityManager.tsx', code);
