"use client";

import React, { useState } from 'react';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Globe, Palette, LayoutTemplate } from 'lucide-react';
import { createMicrosite } from '@/lib/actions/microsite';

const VIBES = [
  {
    id: "scholastic",
    name: "The Classic Academy",
    desc: "Historic, traditional, prestigious. Serif fonts and classic layouts.",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: "innovator",
    name: "The Modern Innovator",
    desc: "Sleek, tech-forward, and bold. Perfect for modern prep schools.",
    image: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: "playful",
    name: "The Early Years",
    desc: "Bright, colorful, and welcoming. Ideal for elementary and pre-K.",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop"
  }
];

const SECTIONS = [
  { id: "hero", label: "Hero & Headline", default: true, required: true },
  { id: "welcome", label: "Head of School Welcome", default: true },
  { id: "mission", label: "Mission & Core Values", default: true },
  { id: "curriculum", label: "Academic Curriculum", default: true },
  { id: "facilities", label: "Campus Facilities", default: false },
  { id: "extracurricular", label: "Extracurricular Activities", default: false },
  { id: "admissions", label: "Admissions Timeline", default: false },
  { id: "tuition", label: "Tuition & Fees", default: false },
  { id: "testimonials", label: "Parent Testimonials", default: false },
  { id: "faq", label: "Frequently Asked Questions", default: false },
  { id: "faculty", label: "Faculty Directory", default: false },
  { id: "contact", label: "Contact & Location", default: true, required: true },
];

export default function WebsiteSetupWizard({ organizationId, initialTitle, onCreated }: { organizationId: string; initialTitle?: string; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(initialTitle || "");
  const [vibe, setVibe] = useState<string>("scholastic");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(SECTIONS.filter(s => s.default).map(s => s.id));
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (id: string, required?: boolean) => {
    if (required) return;
    if (selectedFeatures.includes(id)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== id));
    } else {
      setSelectedFeatures([...selectedFeatures, id]);
    }
  };

  const generate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      // Create the site using the selected vibe as the templateId
      // and pass the selected features to trigger specific default sections
      const res = await createMicrosite(organizationId, { 
        title, 
        templateId: vibe,
        features: selectedFeatures 
      });
      if ((res as any)?.error) {
        setError((res as any).error);
        setIsGenerating(false);
        return;
      }
      onCreated();
    } catch (e: any) {
      setError(e.message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Website Wizard</h1>
            <p className="text-slate-500">Let's build a beautiful website in 3 steps.</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center mb-12">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${step > s ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
            <div className="font-bold">Error:</div>
            <div>{error}</div>
          </div>
        )}

        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="flex-1 p-8 md:p-10">
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center max-w-lg mx-auto">
                  <h2 className="text-3xl font-bold text-slate-800 mb-3">Choose Your Vibe</h2>
                  <p className="text-slate-500 text-lg">Pick a visual direction. We'll automatically apply perfectly paired fonts, colors, and layouts.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  {VIBES.map((v) => (
                    <div 
                      key={v.id} 
                      onClick={() => setVibe(v.id)}
                      className={`cursor-pointer group relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${vibe === v.id ? 'border-blue-600 shadow-xl ring-4 ring-blue-50 transform scale-105' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
                    >
                      <div className="aspect-[4/3] relative">
                        <img src={v.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={v.name} />
                        {vibe === v.id && (
                          <div className="absolute top-3 right-3 bg-blue-600 text-white rounded-full p-1.5 shadow-lg">
                            <CheckCircle2 size={20} />
                          </div>
                        )}
                      </div>
                      <div className="p-5 bg-white border-t border-slate-100 h-full">
                        <h5 className="font-bold text-slate-800 text-lg">{v.name}</h5>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{v.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center max-w-lg mx-auto">
                  <h2 className="text-3xl font-bold text-slate-800 mb-3">What do you want to show?</h2>
                  <p className="text-slate-500 text-lg">Select the sections you have ready today. You can always add more later.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto pt-4">
                  {SECTIONS.map((section) => {
                    const isSelected = selectedFeatures.includes(section.id);
                    return (
                      <div 
                        key={section.id}
                        onClick={() => toggleFeature(section.id, section.required)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${section.required ? 'bg-slate-50 border-slate-200 opacity-70' : isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-300'}`}>
                          {isSelected && <CheckCircle2 size={16} />}
                        </div>
                        <div className="flex-1 font-semibold text-slate-800">
                          {section.label}
                        </div>
                        {section.required && (
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center max-w-xl mx-auto space-y-6">
                  {isGenerating ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-6">
                      <div className="relative">
                        <div className="w-24 h-24 border-4 border-blue-100 rounded-full animate-spin"></div>
                        <div className="w-24 h-24 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
                        <Globe size={32} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800">Building your website...</h2>
                      <div className="space-y-2 text-slate-500 font-medium">
                        <p className="animate-pulse">Extracting brand colors...</p>
                        <p className="animate-pulse delay-150">Writing placeholder copy...</p>
                        <p className="animate-pulse delay-300">Assembling beautiful layouts...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                      </div>
                      <h2 className="text-4xl font-bold text-slate-800">You're all set!</h2>
                      <p className="text-slate-500 text-xl leading-relaxed">
                        We're ready to magically generate your custom website using the <strong>{VIBES.find(v => v.id === vibe)?.name}</strong> theme and your {selectedFeatures.length} selected sections.
                      </p>
                      <div className="pt-8">
                        <div className="text-left bg-slate-50 p-6 rounded-2xl border border-slate-200">
                           <label className="block text-sm font-bold text-slate-700 mb-2">Final Check: Website Title</label>
                           <input 
                             value={title} 
                             onChange={(e) => setTitle(e.target.value)}
                             className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                             placeholder="E.g. Lincoln High School"
                           />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          {!isGenerating && (
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between">
              {step > 1 ? (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={18} /> Back
                </button>
              ) : <div></div>}

              {step < 3 ? (
                <button 
                  onClick={() => setStep(step + 1)}
                  className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                  Continue <ArrowRight size={18} />
                </button>
              ) : (
                <button 
                  onClick={generate}
                  disabled={!title.trim()}
                  className="px-10 py-4 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 transition-colors shadow-xl shadow-green-600/20 flex items-center gap-3 disabled:opacity-50"
                >
                  Generate My Website <Globe size={22} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
