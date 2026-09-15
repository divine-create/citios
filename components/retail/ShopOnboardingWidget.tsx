"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, ArrowRight, ChevronRight, Store, X } from "lucide-react";
import { updateRetailSettings } from "@/lib/actions/retail";
import { useRouter } from "next/navigation";

interface ShopOnboardingWidgetProps {
  settings: any;
  organizationId: string;
  onNavigate: (tab: string) => void;
}

export default function ShopOnboardingWidget({ settings, organizationId, onNavigate }: ShopOnboardingWidgetProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // If no settings exist yet, don't break
  if (!settings) return null;

  const steps = [
    {
      id: "payment",
      label: "Set up how you receive payments",
      description: "Cash and manual payment recording are currently available at the register. Online gateway collection (Stripe, Paystack, Flutterwave) is coming soon.",
      isComplete: settings.hasSetPayment,
      actionText: "Add payment",
      onAction: async () => {
        setUpdating(true);
        await updateRetailSettings(organizationId, { hasSetPayment: true });
        setUpdating(false);
        setIsModalOpen(false);
        onNavigate("Settings");
      }
    },
    {
      id: "storeInfo",
      label: "Complete store information",
      description: "Add your store currency, logo, and other relevant details to your website.",
      isComplete: settings.hasStoreInfo,
      actionText: "Update store info",
      onAction: async () => {
        setUpdating(true);
        await updateRetailSettings(organizationId, { hasStoreInfo: true });
        setUpdating(false);
        setIsModalOpen(false);
        onNavigate("Settings");
      }
    },
    {
      id: "shipping",
      label: "Add shipping prices on your website",
      description: "Add shipping prices on your website for your customers to check out.",
      isComplete: settings.hasShippingPrices,
      actionText: "Set shipping rates",
      onAction: async () => {
        setUpdating(true);
        await updateRetailSettings(organizationId, { hasShippingPrices: true });
        setUpdating(false);
        setIsModalOpen(false);
        onNavigate("Settings");
      }
    },
    {
      id: "products",
      label: "Add products to your store",
      description: "You can always add more products later from the Products page in the side menu.",
      isComplete: settings.hasProducts,
      actionText: "Add products",
      onAction: async () => {
        setUpdating(true);
        await updateRetailSettings(organizationId, { hasProducts: true });
        setUpdating(false);
        setIsModalOpen(false);
        onNavigate("Products & Inventory");
      }
    }
  ];

  const completedCount = steps.filter(s => s.isComplete).length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  
  const isFullyComplete = completedCount === totalCount;
  if (isFullyComplete) return null;

  const nextIncompleteStep = steps.find(s => !s.isComplete);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
        {/* Background illustration */}
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-emerald-50 to-transparent -z-10 pointer-events-none" />
        <Store className="absolute -right-4 -bottom-4 text-emerald-100 opacity-50 pointer-events-none" size={120} />

        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">Complete your onboarding</h2>
          <p className="text-slate-500 mt-1 mb-4">Complete the next steps to launch your website.</p>
          
          <div className="flex items-center gap-4 max-w-md">
            <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
            <span className="text-sm font-bold text-slate-700">{completedCount} / {totalCount} completed</span>
          </div>
        </div>

        <div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
          >
            {nextIncompleteStep?.actionText} <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Complete your onboarding</h3>
                <p className="text-sm text-slate-500 mt-1">Complete the next steps to launch your website.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div 
                    key={step.id} 
                    className={`flex gap-4 p-5 rounded-xl border-2 transition-all ${
                      step.isComplete 
                        ? "border-emerald-100 bg-emerald-50/50" 
                        : nextIncompleteStep?.id === step.id 
                          ? "border-slate-800 bg-white shadow-sm" 
                          : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="mt-0.5">
                      {step.isComplete ? (
                        <CheckCircle2 className="text-emerald-500" size={24} />
                      ) : (
                        <Circle className="text-slate-300" size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold ${step.isComplete ? "text-emerald-900" : "text-slate-800"}`}>
                        {step.label}
                      </h4>
                      <p className={`text-sm mt-1 mb-3 ${step.isComplete ? "text-emerald-700/80" : "text-slate-500"}`}>
                        {step.description}
                      </p>
                      {!step.isComplete && nextIncompleteStep?.id === step.id && (
                        <button 
                          onClick={step.onAction}
                          disabled={updating}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                        >
                          {updating ? "Opening..." : step.actionText} <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
