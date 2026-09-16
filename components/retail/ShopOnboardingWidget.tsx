"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, ArrowRight, ChevronRight, Store, X, Loader2 } from "lucide-react";
import { updateRetailSettings, getProducts, getCustomers, getLocations, getOrders } from "@/lib/actions/retail";
import { useRouter } from "next/navigation";

interface ShopOnboardingWidgetProps {
  settings: any;
  organizationId: string;
  onNavigate: (tab: string) => void;
}

interface LiveCounts {
  hasProducts: boolean;
  hasStock: boolean;
  hasCustomers: boolean;
  hasOrders: boolean;
  hasLocations: boolean;
}

const HIDE_KEY = "shoPOS:onboarding:hidden";

export default function ShopOnboardingWidget({ settings, organizationId, onNavigate }: ShopOnboardingWidgetProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [counts, setCounts] = useState<LiveCounts | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let unmounted = false;
    (async () => {
      try {
        const [products, customers, locations, orders] = await Promise.all([
          getProducts(organizationId),
          getCustomers(organizationId),
          getLocations(organizationId),
          getOrders(organizationId, { limit: 1 }),
        ]);
        if (unmounted) return;
        setCounts({
          hasProducts: products.length > 0,
          hasStock: products.some((p: any) => (p?.stockQuantity ?? 0) > 0),
          hasCustomers: customers.length > 0,
          hasOrders: orders.length > 0,
          hasLocations: locations.length > 0,
        });
      } catch {
        if (!unmounted) setCounts({ hasProducts: false, hasStock: false, hasCustomers: false, hasOrders: false, hasLocations: false });
      }
    })();
    setHidden(localStorage.getItem(HIDE_KEY) === "1");
    return () => {
      unmounted = true;
    };
  }, [organizationId]);

  const steps = [
    {
      id: "products",
      label: "Add your first products",
      description: "Products are what you ring up at the register and list on your online store. You can add photos, prices, and stock levels now or later.",
      isComplete: counts ? counts.hasProducts || !!settings?.hasProducts : false,
      actionText: "Add products",
      target: "Products & Inventory",
    },
    {
      id: "stock",
      label: "Stock your products",
      description: "Set a starting quantity for each product so the register can guard against selling more than you have.",
      isComplete: counts ? counts.hasStock : false,
      actionText: "Manage stock",
      target: "Products & Inventory",
    },
    {
      id: "location",
      label: "Add a store location",
      description: "Tell us where your store is so receipts and your website carry the right address.",
      isComplete: counts ? counts.hasLocations : false,
      actionText: "Add location",
      target: "Locations",
    },
    {
      id: "customer",
      label: "Save your first customer",
      description: "Keep track of who buys from you, what they spend, and their loyalty points.",
      isComplete: counts ? counts.hasCustomers : false,
      actionText: "Add customer",
      target: "Customers",
    },
    {
      id: "sale",
      label: "Make your first sale",
      description: "Open the register and ring up a sale — cash and card recording are available today.",
      isComplete: counts ? counts.hasOrders : false,
      actionText: "Go to POS",
      target: "POS Terminal",
    },
    {
      id: "storefront",
      label: "Publish your online store",
      description: "Generate a live storefront from your products. You'll get a web address you can share.",
      isComplete: !!settings?.storeUrl,
      actionText: "Open website builder",
      target: null,
      href: `/business/website?org=${organizationId}`,
    },
    {
      id: "shipping",
      label: "Add shipping prices to your website",
      description: "Set delivery prices so customers on your website can check out with shipping included.",
      isComplete: !!settings?.hasShippingPrices,
      actionText: "Set shipping rates",
      target: "Settings",
    },
    {
      id: "storeInfo",
      label: "Complete store information",
      description: "Add your store name, currency, and receipt message so receipts and your website look professional.",
      isComplete: !!settings?.hasStoreInfo,
      actionText: "Update store info",
      target: "Settings",
    },
  ];

  if (!settings) return null;
  if (hidden) return null;
  if (!counts) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex items-center gap-3 text-slate-400 text-sm">
        <Loader2 className="animate-spin" size={16} /> Checking setup progress...
      </div>
    );
  }

  const completedCount = steps.filter((s) => s.isComplete).length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const isFullyComplete = completedCount === totalCount;
  if (isFullyComplete) return null;

  const nextIncompleteStep = steps.find((s) => !s.isComplete);

  const dismiss = () => {
    localStorage.setItem(HIDE_KEY, "1");
    setHidden(true);
  };

  const go = (step: (typeof steps)[number]) => {
    if (step.href) {
      router.push(step.href);
    } else if (step.target) {
      setIsModalOpen(false);
      onNavigate(step.target);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-brand-50 to-transparent pointer-events-none" />
        <Store className="absolute -right-4 -bottom-4 text-brand-200 opacity-40 pointer-events-none" size={120} />

        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">Let&apos;s get your store set up</h2>
            <button onClick={dismiss} title="Hide this checklist" className="p-1.5 text-slate-300 hover:text-slate-500 rounded-lg transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          </div>
          <p className="text-slate-500 mt-1 mb-4">The next step is “{nextIncompleteStep?.label}”. You can finish any time.</p>

          <div className="flex items-center gap-4 max-w-md">
            <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-sm font-bold text-ink">{completedCount} / {totalCount} completed · {progressPercent}%</span>
          </div>
        </div>

        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-sm shadow-brand-700/25"
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
                <h3 className="text-xl font-black text-ink">Store setup</h3>
                <p className="text-sm text-slate-500 mt-1">{completedCount} of {totalCount} steps done — choose what to do next.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex gap-4 p-5 rounded-xl border-2 transition-all ${
                      step.isComplete
                        ? "border-emerald-100 bg-emerald-50/50"
                        : nextIncompleteStep?.id === step.id
                          ? "border-brand-600 bg-white shadow-sm"
                          : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="mt-0.5">
                      {step.isComplete ? (
                        <CheckCircle2 className="text-emerald-500" size={24} />
                      ) : (
                        <Circle className={`${nextIncompleteStep?.id === step.id ? "text-brand-600" : "text-slate-300"}`} size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold ${step.isComplete ? "text-emerald-900" : "text-ink"}`}>{step.label}</h4>
                      <p className={`text-sm mt-1 mb-3 ${step.isComplete ? "text-emerald-700/80" : "text-slate-500"}`}>{step.description}</p>
                      {!step.isComplete && nextIncompleteStep?.id === step.id && (
                        <button
                          onClick={() => go(step)}
                          className="px-4 py-2 inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold rounded-lg transition-colors"
                        >
                          {step.actionText} <ChevronRight size={16} />
                        </button>
                      )}
                      {step.isComplete && <span className="text-xs font-semibold text-emerald-600">Done</span>}
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