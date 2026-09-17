"use client";
import WebsiteSetupWizard from './WebsiteSetupWizard';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Plus, Trash2, Edit2, Eye, EyeOff, ArrowUp, ArrowDown, X, ExternalLink, Upload, Loader2, GripVertical, Search, CheckCircle, XCircle } from "lucide-react";
import {
  getMicrosite,
  createMicrosite,
  updateMicrositeSettings,
  publishMicrosite,
  unpublishMicrosite,
  addMicrositeSection,
  updateMicrositeSection,
  deleteMicrositeSection,
  reorderMicrositeSections,
  uploadAsset,
  addMicrositePage,
  updateMicrositePage,
  deleteMicrositePage,
  updateMicrositeNavigation,
  resetMicrosite,
} from "@/lib/actions/microsite";
import { THEMES, THEME_IDS, SECTION_TYPES, SectionType } from "./themes";

interface Section {
  id: string;
  pageId: string | null;
  type: string;
  order: number;
  visible: boolean;
  content: string;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  status: string;
}

interface NavItem {
  id: string;
  label: string;
  url: string | null;
  pageId: string | null;
}

interface Site {
  id: string;
  organizationId: string;
  slug: string;
  title: string;
  tagline: string | null;
  theme: string;
  primaryColor: string | null;
  accentColor: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  borderRadius: string | null;
  status: "draft" | "published";
  seoTitle: string | null;
  seoDescription: string | null;
  logoAssetId: string | null;
  pages: Page[];
  navItems: NavItem[];
  sections: Section[];
}

const DEFAULT_CONTENT: Record<string, any> = {
  hero: { heading: "Welcome to Our Site", subheading: "Discover uncompromising quality and unparalleled service. Your journey begins here.", ctaText: "Explore Now", ctaLink: "#contact", imageAssetId: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop" },
  about: { heading: "Our Story", body: "Founded on the principles of excellence and innovation, our journey has been defined by a relentless pursuit of perfection. We believe in creating memorable experiences and forging lasting relationships with everyone we serve." },
  services: { heading: "Our Signature Services", items: [{ title: "Personalized Consultation", description: "Tailored advice from industry experts to meet your unique needs." }, { title: "Premium Experience", description: "An end-to-end luxury service designed to exceed your expectations." }] },
  gallery: { heading: "Gallery", imageAssetIds: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop", "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=800&auto=format&fit=crop", "https://images.unsplash.com/photo-1541123437800-1def89d6c342?q=80&w=800&auto=format&fit=crop"] },
  hours: { heading: "Operating Hours", rows: [{ day: "Monday - Friday", hours: "9:00 AM - 6:00 PM" }, { day: "Saturday", hours: "10:00 AM - 4:00 PM" }] },
  testimonials: { heading: "Client Voices", items: [{ quote: "An absolutely phenomenal experience from start to finish. The attention to detail is truly unmatched.", author: "Eleanor Vance" }] },
  contact: { heading: "Get in Touch", address: "123 Elegance Boulevard, New York, NY 10001", phone: "+1 (555) 123-4567", email: "concierge@example.com" },
  cta: { heading: "Ready to elevate your experience?", body: "Connect with our team today and let us bring your vision to life.", buttonText: "Contact Us", buttonLink: "#contact" },
  footer: { tagline: "Excellence in every detail.", socialLinks: [] },
  "school-admissions-timeline": { heading: "Admissions Journey", steps: [{ title: "Submit Inquiry", description: "Fill out our online form to receive an information packet." }, { title: "Campus Tour", description: "Schedule a personalized visit to see our facilities in action." }, { title: "Application Review", description: "Our admissions committee carefully reviews your child's application." }] },
  "school-curriculum": { heading: "Curriculum Highlights", items: [{ phase: "Early Years Foundation", description: "Fostering curiosity and a love for learning in a nurturing environment." }, { phase: "Middle School Prep", description: "Building critical thinking skills and academic rigor." }] },
  "school-head-welcome": { heading: "Welcome from the Head of School", body: "We are thrilled to welcome you to our community. Our mission is to inspire, challenge, and empower every student to reach their fullest potential.", signature: "Dr. Jonathan Hayes", imageAssetId: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop" },
  "hotel-rooms": { heading: "Rooms & Suites", items: [{ name: "Oceanview Suite", description: "Spacious luxury with panoramic views of the sea, featuring a king-size bed and private balcony.", imageAssetId: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200&auto=format&fit=crop" }, { name: "Deluxe King", description: "Modern elegance and comfort wrapped into a beautifully appointed space for ultimate relaxation.", imageAssetId: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?q=80&w=1200&auto=format&fit=crop" }] },
  "hotel-amenities": { heading: "Premium Amenities", items: [{ name: "Tranquility Spa", description: "Rejuvenate your body and mind with our world-class treatments." }, { name: "Infinity Pool", description: "Swim overlooking the horizon in our temperature-controlled infinity pool." }, { name: "Fine Dining", description: "Savor exquisite culinary creations crafted by our Michelin-starred chefs." }] },
  "hotel-booking": { heading: "Book Your Stay", subtext: "Best rate guaranteed when you book direct." },
  "hotel-feature": { heading: "Culinary Excellence", subheading: "Unforgettable Dining", body: "Savor a symphony of flavors crafted by our Michelin-starred chefs, set against the breathtaking backdrop of the ocean. Our signature restaurant offers an intimate and unforgettable gastronomic journey.", imageAssetId: "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=1200&auto=format&fit=crop", reverseLayout: false },
  "retail-products": { heading: "Curated Collection", categoryId: "" },
};

export default function MicrositeBuilder({ organizationId }: { organizationId: string }) {
  const [site, setSite] = useState<Site | null | undefined>(undefined);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [orgType, setOrgType] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [tab, setTab] = useState<"pages" | "navigation" | "theme" | "settings">("pages");
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const load = async () => {
    const data = await getMicrosite(organizationId);
    setSite(data);
    if (data) {
      const { getInquiries } = await import('@/lib/actions/microsite');
      const inqs = await getInquiries(organizationId);
      setInquiries(inqs);
    }
  };

  const loadOrgData = async () => {
    const { getOrganizationType, getOrganizationName } = await import('@/lib/actions/microsite');
    const [type, name] = await Promise.all([
      getOrganizationType(organizationId),
      getOrganizationName(organizationId)
    ]);
    setOrgType(type);
    setOrgName(name || "");
  };

  useEffect(() => {
    load();
    loadOrgData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  if (site === undefined) return <p className="text-sm text-slate-400 py-8 text-center">Loading...</p>;

  if (!site) {
    if (orgType === 'SCHOOL') {
      return <WebsiteSetupWizard organizationId={organizationId} initialTitle={orgName} onCreated={load} />;
    }
    return <CreateSiteForm organizationId={organizationId} initialTitle={orgName} orgType={orgType} onCreated={load} />;
  }

  const move = async (index: number, direction: -1 | 1) => {
    const sorted = [...site.sections].sort((a, b) => a.order - b.order);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
    await reorderMicrositeSections(site.id, sorted.map((s) => s.id));
    load();
  };

  const toggleVisible = async (section: Section) => {
    // Optimistic UI update
    setSite({
      ...site!,
      sections: site!.sections.map((s) => s.id === section.slug ? { ...s, visible: !s.visible } : s)
    });
    const res = await updateMicrositeSection(section.slug, { visible: !section.visible });
    if ((res as any)?.error) {
      alert((res as any).error);
      load(); // revert on failure
      return;
    }
    load();
  };

  const remove = async (sectionId: string) => {
    if (!confirm("Remove this section from the website?")) return;
    setSite({ ...site!, sections: site!.sections.filter((s) => s.id !== sectionId) });
    const res = await deleteMicrositeSection(sectionId);
    if ((res as any)?.error) {
      alert((res as any).error);
      load(); // revert optimistic update
      return;
    }
    load();
  };

  const togglePublish = async () => {
    if (site.status === "published") {
      await unpublishMicrosite(site.id);
    } else {
      const res = await publishMicrosite(site.id);
      if ((res as any)?.error) { alert((res as any).error); return; }
    }
    load();
  };

  const sortedSections = [...site.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Globe size={20} /></div>
          <div>
            <h3 className="font-bold text-slate-800">{site.title}</h3>
            <p className="text-xs text-slate-400">{site.slug}.cityconnect.app</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${site.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {site.status === "published" ? "Published" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/site/${site.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink size={14} /> Preview
          </a>
          <button
            onClick={togglePublish}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${site.status === "published" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
          >
            {site.status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2 mb-4 overflow-x-auto">
        <button
          onClick={() => { setTab("pages"); setActivePageId(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${tab === "pages" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Pages
        </button>
        {orgType !== 'SCHOOL' && (
          <button
            onClick={() => setTab("navigation")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${tab === "navigation" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Navigation
          </button>
        )}
        <button
          onClick={() => setTab("theme")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${tab === "theme" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Theme & Brand
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${tab === "settings" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Settings
        </button>
      </div>

      {tab === "pages" && !activePageId && (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-bold text-slate-800">Website Pages</h3>
            <button onClick={async () => {
              const title = prompt("New Page Title:");
              if (!title) return;
              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              const res = await addMicrositePage(site.id, { title, slug });
              if ((res as any)?.error) alert((res as any).error);
              else load();
            }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> New Page
            </button>
          </div>
          <div className="space-y-2">
            {site.pages.map(page => (
              <div key={page.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800">{page.title} {page.isHome && <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Home</span>}</h4>
                  <p className="text-xs text-slate-400">/{page.isHome ? "" : page.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActivePageId(page.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
                    Edit Sections
                  </button>
                  {!page.isHome && (
                    <button onClick={async () => {
                      if (!confirm(`Delete ${page.title}?`)) return;
                      const res = await deleteMicrositePage(page.id);
                      if ((res as any)?.error) alert((res as any).error);
                      else load();
                    }} className="px-2 py-1.5 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pages" && activePageId && (() => {
        const activePage = site.pages.find(p => p.id === activePageId);
        const pageSections = site.sections.filter(s => s.pageId === activePageId).sort((a, b) => a.order - b.order);
        return (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setActivePageId(null)} className="text-slate-400 hover:text-slate-700 font-medium text-sm px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">
                &larr; Back to Pages
              </button>
              <h3 className="font-bold text-slate-800 ml-2">Editing: {activePage?.title}</h3>
            </div>
            <button onClick={() => setAddingType(SECTION_TYPES[0].id)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> Add Section
            </button>
          </div>

          {pageSections.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl text-center py-12 text-slate-400 text-sm">No sections yet — add one to start building this page.</div>
          ) : (
            <div className="space-y-2">
              {pageSections.map((section, i) => (
                <div
                  key={section.slug}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(i);
                    e.dataTransfer.effectAllowed = "move";
                    setTimeout(() => e.currentTarget.classList.add("opacity-40"), 0);
                  }}
                  onDragEnd={(e) => {
                    setDraggedIndex(null);
                    e.currentTarget.classList.remove("opacity-40");
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (draggedIndex === null || draggedIndex === i) return;
                    const next = [...pageSections];
                    const item = next.splice(draggedIndex, 1)[0];
                    next.splice(i, 0, item);
                    setSite({ ...site, sections: site.sections.map(s => {
                      if (s.pageId !== activePageId) return s;
                      const nextIndex = next.findIndex(n => n.slug === s.id);
                      return { ...s, order: nextIndex };
                    }) } as Site);
                    await reorderMicrositeSections(site.id, next.map((s) => s.id));
                    load();
                  }}
                  className={`bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 transition-colors ${draggedIndex === i ? 'shadow-inner' : 'hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex items-center justify-center -ml-1 py-2">
                      <GripVertical size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{SECTION_TYPES.find((t) => t.id === section.type)?.label ?? section.type}</p>
                      <p className="text-xs text-slate-400 truncate max-w-xs">{sectionSummary(section as unknown as Section)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleVisible(section as unknown as Section)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors" title={section.visible ? "Hide" : "Show"}>
                      {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => setEditingSection(section as unknown as Section)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => remove(section.slug)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {tab === "navigation" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6 max-w-2xl">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800">Navigation Menu</h3>
              <p className="text-sm text-slate-500">Manage links in your header.</p>
            </div>
          </div>
          <ListEditor
            label="Menu Items"
            items={site.navItems || []}
            onChange={async (items) => {
              setSite({ ...site, navItems: items });
              await updateMicrositeNavigation(site.id, items);
              load();
            }}
            newItem={{ label: "New Link", url: "#", pageId: null }}
            fields={[
              { key: "label", label: "Link Label" },
              { key: "url", label: "Custom URL (or #section-id)" },
              // In a full implementation, we'd add a dropdown to select pageId instead of typing url
            ]}
          />
        </div>
      )}

      {tab === "theme" && <ThemePanel site={site} organizationId={organizationId} orgType={orgType} onSaved={load} />}

      {tab === "settings" && <SettingsPanel site={site} organizationId={organizationId} orgType={orgType} onSaved={load} />}

      {addingType && (
        <SectionTypePicker
          orgType={orgType}
          onPick={async (type) => {
            setAddingType(null);
            // Default to first page for now until multi-page UI is built
            const targetPageId = (site as any).pages?.[0]?.id || (site as any).sections?.[0]?.pageId;
            if (!targetPageId) { alert("No page available to add section."); return; }

            const tempId = "temp-" + Date.now();
            const tempSection = { id: tempId, type, content: JSON.stringify(DEFAULT_CONTENT[type] ?? {}), visible: true, order: site.sections.length } as any;
            setSite({ ...site!, sections: [...site!.sections, tempSection] });

            const res = await addMicrositeSection(site.id, { pageId: targetPageId, type, content: DEFAULT_CONTENT[type] ?? {} });
            if ((res as any)?.section) {
              await load();
              setEditingSection((res as any).section);
            } else {
              alert((res as any)?.error || "Failed to add section");
              load();
            }
          }}
          onClose={() => setAddingType(null)}
        />
      )}

      {editingSection && (
        <SectionEditorModal
          section={editingSection}
          organizationId={organizationId}
          onClose={() => setEditingSection(null)}
          onSaved={() => { setEditingSection(null); load(); }}
        />
      )}
    </div>
  );
}

function sectionSummary(section: Section) {
  try {
    const c = JSON.parse(section.content);
    return c.heading || c.title || c.tagline || "—";
  } catch {
    return "—";
  }
}

function CreateSiteForm({ organizationId, initialTitle, orgType, onCreated }: { organizationId: string; initialTitle?: string; orgType?: string | null; onCreated: () => void }) {
  const [title, setTitle] = useState(initialTitle || "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (initialTitle && !title) setTitle(initialTitle);
  }, [initialTitle]);

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await createMicrosite(organizationId, { title, templateId: selectedTemplate || undefined });
      if ((res as any)?.error) { setError((res as any).error); return; }
      onCreated();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Globe size={24} /></div>
        <h3 className="font-bold text-slate-800 text-2xl">Create your website</h3>
        <p className="text-sm text-slate-500 mt-2">A dedicated, professional website for your organization.</p>
      </div>

      <div className="max-w-md mx-auto">
        <TextField label="Website Title" value={title} onChange={setTitle} placeholder="Lincoln High School" />
      </div>

      {orgType === 'HOTEL' && (
        <div className="space-y-4">
          <h4 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">Select a Starter Template</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Template: Luxury Resort */}
            <div 
              onClick={() => setSelectedTemplate('luxury-resort')}
              className={`cursor-pointer group relative rounded-xl border-2 overflow-hidden transition-all ${selectedTemplate === 'luxury-resort' ? 'border-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="aspect-[4/3] bg-slate-100 relative">
                <img src="https://images.unsplash.com/photo-1542314831-c6a4d14248cb?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Luxury Resort" />
                {selectedTemplate === 'luxury-resort' && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow">Selected</div>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <h5 className="font-bold text-slate-800">Luxury Resort</h5>
                <p className="text-xs text-slate-500 mt-1">Moody, elegant "Horizon" theme with serif fonts. Best for high-end properties.</p>
              </div>
            </div>

            {/* Template: City Boutique */}
            <div 
              onClick={() => setSelectedTemplate('city-boutique')}
              className={`cursor-pointer group relative rounded-xl border-2 overflow-hidden transition-all ${selectedTemplate === 'city-boutique' ? 'border-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="aspect-[4/3] bg-slate-100 relative">
                <img src="https://images.unsplash.com/photo-1518733057094-95b5ee1404c3?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="City Boutique" />
                {selectedTemplate === 'city-boutique' && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow">Selected</div>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <h5 className="font-bold text-slate-800">City Boutique</h5>
                <p className="text-xs text-slate-500 mt-1">Minimalist, modern theme with stark contrasts. Perfect for urban lofts.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {orgType === 'RETAIL' && (
        <div className="space-y-4">
          <h4 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">Select a Retail Template</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Template: Modern Apparel */}
            <div 
              onClick={() => setSelectedTemplate('modern-apparel')}
              className={`cursor-pointer group relative rounded-xl border-2 overflow-hidden transition-all ${selectedTemplate === 'modern-apparel' ? 'border-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="aspect-[4/3] bg-slate-100 relative">
                <img src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Modern Apparel" />
                {selectedTemplate === 'modern-apparel' && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow">Selected</div>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <h5 className="font-bold text-slate-800">Modern Apparel</h5>
                <p className="text-xs text-slate-500 mt-1">Sleek layout focused on large imagery and clothing lines.</p>
              </div>
            </div>

            {/* Template: Local Grocery */}
            <div 
              onClick={() => setSelectedTemplate('local-grocery')}
              className={`cursor-pointer group relative rounded-xl border-2 overflow-hidden transition-all ${selectedTemplate === 'local-grocery' ? 'border-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="aspect-[4/3] bg-slate-100 relative">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Local Grocery" />
                {selectedTemplate === 'local-grocery' && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow">Selected</div>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <h5 className="font-bold text-slate-800">Local Grocery</h5>
                <p className="text-xs text-slate-500 mt-1">Clean and organized structure designed for massive product catalogs.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {orgType === 'SCHOOL' && (
        <div className="space-y-4">
          <h4 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">Select a School Template</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Template: Prep Academy */}
            <div 
              onClick={() => setSelectedTemplate('prep-academy')}
              className={`cursor-pointer group relative rounded-xl border-2 overflow-hidden transition-all ${selectedTemplate === 'prep-academy' ? 'border-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="aspect-[4/3] bg-slate-100 relative">
                <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Prep Academy" />
                {selectedTemplate === 'prep-academy' && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow">Selected</div>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <h5 className="font-bold text-slate-800">Prep Academy</h5>
                <p className="text-xs text-slate-500 mt-1">Historic, prestigious "Scholastic" theme with a traditional academic layout.</p>
              </div>
            </div>

            {/* Template: Modern College */}
            <div 
              onClick={() => setSelectedTemplate('modern-college')}
              className={`cursor-pointer group relative rounded-xl border-2 overflow-hidden transition-all ${selectedTemplate === 'modern-college' ? 'border-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="aspect-[4/3] bg-slate-100 relative">
                <img src="https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Modern College" />
                {selectedTemplate === 'modern-college' && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow">Selected</div>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <h5 className="font-bold text-slate-800">Modern College</h5>
                <p className="text-xs text-slate-500 mt-1">Sleek "Minimal" theme designed for innovation hubs and engineering schools.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {error && <ErrorBanner text={error} />}

      <div className="max-w-md mx-auto pt-4">
        <button
          onClick={submit}
          disabled={isSaving || !title.trim() || ((orgType === 'HOTEL' || orgType === 'RETAIL' || orgType === 'SCHOOL') && !selectedTemplate)}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {isSaving ? "Provisioning Template..." : "Install Website"}
        </button>
      </div>
    </div>
  );
}

function DomainPromoBanner({ currentDomain, organizationId }: { currentDomain?: string | null, organizationId: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
      <div>
        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Globe size={16} className="text-blue-600" /> Custom Domain
        </h3>
        <p className="text-sm text-slate-500 max-w-sm">
          {currentDomain 
            ? `Your website is currently connected to ${currentDomain}.`
            : "Upgrade your website with a custom web address (e.g. yourschool.com)."}
        </p>
      </div>
      <Link 
        href={`/business/domain?org=${organizationId}`}
        className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
      >
        {currentDomain ? "Manage Domain" : "Get a Custom Domain"}
      </Link>
    </div>
  );
}

function ThemePanel({ site, organizationId, orgType, onSaved }: { site: Site; organizationId: string; orgType: string | null; onSaved: () => void }) {
  const [theme, setTheme] = useState(site.theme);
  const [logoAssetId, setLogoAssetId] = useState<string | null>(site.logoAssetId);
  const [primaryColor, setPrimaryColor] = useState(site.primaryColor ?? "");
  const [accentColor, setAccentColor] = useState(site.accentColor ?? "");
  const [headingFont, setHeadingFont] = useState(site.headingFont ?? "inter");
  const [bodyFont, setBodyFont] = useState(site.bodyFont ?? "inter");
  const [borderRadius, setBorderRadius] = useState(site.borderRadius ?? "md");
  
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isSchool = orgType === "SCHOOL";
  const isHotel = orgType === "HOTEL";

  const allowedThemes = THEME_IDS.filter((id) => {
    if (isSchool) return ["minimal", "editorial", "academy", "innovator", "scholastic", "playful", "prestige"].includes(id);
    if (isHotel) return ["minimal", "editorial", "horizon"].includes(id);
    return !["academy", "scholastic", "playful", "prestige", "horizon"].includes(id);
  });

  const save = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const payload: any = { theme, logoAssetId };
      if (primaryColor) payload.primaryColor = primaryColor;
      if (accentColor) payload.accentColor = accentColor;
      if (headingFont) payload.headingFont = headingFont;
      if (bodyFont) payload.bodyFont = bodyFont;
      if (borderRadius) payload.borderRadius = borderRadius;
      
      const res = await updateMicrositeSettings(site.id, payload);
      if ((res as any)?.error) { setError((res as any).error); return; }
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6 max-w-2xl">
      {error && <ErrorBanner text={error} />}
      
      <div className="pt-2">
        <h3 className="font-bold text-slate-800 mb-4">Brand Kit</h3>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Primary Background Color (Hex)" value={primaryColor} onChange={setPrimaryColor} placeholder="#ffffff" />
          <TextField label="Accent Color (Hex)" value={accentColor} onChange={setAccentColor} placeholder="#3b82f6" />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Heading Font</label>
            <select value={headingFont} onChange={e => setHeadingFont(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors">
              <option value="inter">Inter (Sans-Serif)</option>
              <option value="playfair">Playfair Display (Serif)</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Body Font</label>
            <select value={bodyFont} onChange={e => setBodyFont(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors">
              <option value="inter">Inter (Sans-Serif)</option>
              <option value="playfair">Playfair Display (Serif)</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Border Radius</label>
            <select value={borderRadius} onChange={e => setBorderRadius(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors">
              <option value="none">Square (0px)</option>
              <option value="sm">Small (4px)</option>
              <option value="md">Medium (8px)</option>
              <option value="lg">Large (16px)</option>
              <option value="full">Pill (Fully rounded)</option>
            </select>
          </div>
        </div>
      </div>

      <AssetPicker
        label="Logo"
        organizationId={organizationId}
        assetId={logoAssetId}
        onChange={setLogoAssetId}
      />

      <div className="pt-2 border-t border-slate-100">
        <label className="text-sm font-medium text-slate-700 mb-2 block">Base Theme</label>
        <p className="text-xs text-slate-500 mb-3">Select a layout base. Your brand colors and fonts will override the base theme.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {allowedThemes.map((id) => {
            const t = THEMES[id];
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`text-left border-2 rounded-lg overflow-hidden transition-colors ${theme === id ? "border-blue-500" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div style={{ background: t.bg }} className="h-14 flex items-center justify-center gap-1 p-2">
                  <div style={{ background: t.accent, width: 20, height: 20, borderRadius: t.radius }} />
                  <div style={{ background: t.surface, width: 20, height: 20, borderRadius: t.radius }} />
                </div>
                <div className="px-2 py-1.5 text-xs font-medium text-slate-700">{t.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={save}
        disabled={isSaving}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        {isSaving ? "Saving..." : "Save Theme"}
      </button>
    </div>
  );
}

function SettingsPanel({ site, organizationId, orgType, onSaved }: { site: Site; organizationId: string; orgType: string | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: site.title,
    tagline: site.tagline ?? "",
    slug: site.slug,
    seoTitle: site.seoTitle ?? "",
    seoDescription: site.seoDescription ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await updateMicrositeSettings(site.id, { ...form });
      if ((res as any)?.error) { setError((res as any).error); return; }
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6 max-w-2xl">
      {error && <ErrorBanner text={error} />}
      
      <DomainPromoBanner currentDomain={null} organizationId={organizationId} />

      <TextField label="Website Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
      <TextField label="Tagline" value={form.tagline} onChange={(v) => setForm((f) => ({ ...f, tagline: v }))} placeholder="A short line about your organization" />
      <TextField label="Web Address (slug)" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} placeholder="your-org-name" />
      <TextField label="SEO Title" value={form.seoTitle} onChange={(v) => setForm((f) => ({ ...f, seoTitle: v }))} placeholder="Defaults to Website Title" />
      <TextArea label="SEO Description" value={form.seoDescription} onChange={(v) => setForm((f) => ({ ...f, seoDescription: v }))} />

      <button
        onClick={save}
        disabled={isSaving}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </button>

      <div className="pt-8 border-t border-slate-200">
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <h4 className="font-bold text-red-800 mb-1">Danger Zone</h4>
          <p className="text-sm text-red-600 mb-4">Want to start completely fresh? This will delete your current website and restart the setup wizard.</p>
          <button
            onClick={async () => {
              if (confirm("Are you completely sure? This will delete all pages, sections, and navigation links. This cannot be undone.")) {
                await resetMicrosite(site.id);
                onSaved(); // This calls load(), which will see site=null and launch the Wizard!
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Rebuild Website from Scratch
          </button>
        </div>
      </div>
    </div>
  );
}

// Vertical-specific section types are prefixed (`school-`, `hotel-`,
// `retail-`, ...) — a section with no known prefix is generic and always
// available; a prefixed one only shows for its matching org type.
const VERTICAL_SECTION_PREFIXES: Record<string, string> = { SCHOOL: "school-", HOTEL: "hotel-", RETAIL: "retail-" };

function SectionTypePicker({ onPick, onClose, orgType }: { onPick: (type: string) => void; onClose: () => void; orgType: string | null }) {
  const myPrefix = orgType ? VERTICAL_SECTION_PREFIXES[orgType] : undefined;

  const allowedSections = SECTION_TYPES.filter((t) => {
    const matchedPrefix = Object.values(VERTICAL_SECTION_PREFIXES).find((p) => t.id.startsWith(p));
    if (!matchedPrefix) return true;
    return matchedPrefix === myPrefix;
  });

  return (
    <Modal title="Add Section" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {allowedSections.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className="px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
          >
            {t.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function SectionEditorModal({ section, organizationId, onClose, onSaved }: {
  section: Section; organizationId: string; onClose: () => void; onSaved: () => void;
}) {
  const initial = (() => {
    try { return JSON.parse(section.content); } catch { return {}; }
  })();
  const [content, setContent] = useState<any>(initial);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    try {
      await updateMicrositeSection(section.slug, { content });
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const typeLabel = SECTION_TYPES.find((t) => t.id === section.type)?.label ?? section.type;

  return (
    <Modal title={`Edit ${typeLabel}`} onClose={onClose}>
      <SectionForm type={section.type as SectionType} content={content} onChange={setContent} organizationId={organizationId} />
      <ModalActions onCancel={onClose} onSubmit={save} disabled={isSaving} isSaving={isSaving} label="Save Section" />
    </Modal>
  );
}

function SectionForm({ type, content, onChange, organizationId }: {
  type: SectionType; content: any; onChange: (c: any) => void; organizationId: string;
}) {
  const set = (key: string, value: any) => onChange({ ...content, [key]: value });

  switch (type) {
    case "hero":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <TextArea label="Subheading" value={content.subheading || ""} onChange={(v) => set("subheading", v)} />
          <AssetPicker label="Background Image" organizationId={organizationId} assetId={content.imageAssetId ?? null} onChange={(id) => set("imageAssetId", id)} />
          <TextField label="Button Text" value={content.ctaText || ""} onChange={(v) => set("ctaText", v)} />
          <TextField label="Button Link" value={content.ctaLink || ""} onChange={(v) => set("ctaLink", v)} placeholder="#contact" />
        </>
      );
    case "about":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <TextArea label="Body" value={content.body || ""} onChange={(v) => set("body", v)} />
          <AssetPicker label="Image" organizationId={organizationId} assetId={content.imageAssetId ?? null} onChange={(id) => set("imageAssetId", id)} />
        </>
      );
    case "services":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <ListEditor
            label="Items"
            items={content.items || []}
            onChange={(items) => set("items", items)}
            newItem={{ title: "", description: "" }}
            fields={[{ key: "title", label: "Title" }, { key: "description", label: "Description", textarea: true }]}
          />
        </>
      );
    case "gallery":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <GalleryPicker organizationId={organizationId} imageAssetIds={content.imageAssetIds || []} onChange={(ids) => set("imageAssetIds", ids)} />
        </>
      );
    case "hours":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <ListEditor
            label="Rows"
            items={content.rows || []}
            onChange={(rows) => set("rows", rows)}
            newItem={{ day: "", hours: "" }}
            fields={[{ key: "day", label: "Day" }, { key: "hours", label: "Hours" }]}
          />
        </>
      );
    case "testimonials":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <ListEditor
            label="Testimonials"
            items={content.items || []}
            onChange={(items) => set("items", items)}
            newItem={{ quote: "", author: "" }}
            fields={[{ key: "quote", label: "Quote", textarea: true }, { key: "author", label: "Author" }]}
          />
        </>
      );
    case "contact":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <TextField label="Address" value={content.address || ""} onChange={(v) => set("address", v)} />
          <TextField label="Phone" value={content.phone || ""} onChange={(v) => set("phone", v)} />
          <TextField label="Email" value={content.email || ""} onChange={(v) => set("email", v)} />
        </>
      );
    case "cta":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <TextArea label="Body" value={content.body || ""} onChange={(v) => set("body", v)} />
          <TextField label="Button Text" value={content.buttonText || ""} onChange={(v) => set("buttonText", v)} />
          <TextField label="Button Link" value={content.buttonLink || ""} onChange={(v) => set("buttonLink", v)} placeholder="#contact" />
        </>
      );
    case "footer":
      return (
        <>
          <TextField label="Tagline" value={content.tagline || ""} onChange={(v) => set("tagline", v)} />
          <ListEditor
            label="Social Links"
            items={content.socialLinks || []}
            onChange={(links) => set("socialLinks", links)}
            newItem={{ label: "", url: "" }}
            fields={[{ key: "label", label: "Label" }, { key: "url", label: "URL" }]}
          />
        </>
      );
    case "school-admissions-timeline":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <ListEditor
            label="Steps"
            items={content.steps || []}
            onChange={(steps) => set("steps", steps)}
            newItem={{ title: "", description: "" }}
            fields={[{ key: "title", label: "Title" }, { key: "description", label: "Description", textarea: true }]}
          />
        </>
      );
    case "school-curriculum":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <ListEditor
            label="Phases/Grades"
            items={content.items || []}
            onChange={(items) => set("items", items)}
            newItem={{ phase: "", description: "" }}
            fields={[{ key: "phase", label: "Phase/Grade" }, { key: "description", label: "Description", textarea: true }]}
          />
        </>
      );
    case "school-head-welcome":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <TextArea label="Body (Quote)" value={content.body || ""} onChange={(v) => set("body", v)} />
          <TextField label="Signature (Name)" value={content.signature || ""} onChange={(v) => set("signature", v)} />
          <AssetPicker label="Portrait Photo" organizationId={organizationId} assetId={content.imageAssetId ?? null} onChange={(id) => set("imageAssetId", id)} />
        </>
      );
    case "hotel-feature":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <TextField label="Subheading" value={content.subheading || ""} onChange={(v) => set("subheading", v)} />
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Body Text</label>
            <textarea value={content.body || ""} onChange={(e) => set("body", e.target.value)} rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:border-blue-500" />
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={!!content.reverseLayout} onChange={(e) => set("reverseLayout", e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
              Reverse Layout (Image on Right)
            </label>
          </div>
          <AssetPicker label="Feature Image" organizationId={organizationId} assetId={content.imageAssetId ?? null} onChange={(id) => set("imageAssetId", id)} />
        </>
      );
    case "hotel-booking":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <TextField label="Subtext" value={content.subtext || ""} onChange={(v) => set("subtext", v)} />
        </>
      );
    case "hotel-rooms":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          {/* Note: In a real implementation we might want a richer ListEditor that supports image uploads per item, but keeping it simple for now */}
          <ListEditor
            label="Rooms & Suites"
            items={content.items || []}
            onChange={(items) => set("items", items)}
            newItem={{ name: "", description: "" }}
            fields={[{ key: "name", label: "Room Name" }, { key: "description", label: "Description", textarea: true }]}
          />
        </>
      );
    case "hotel-amenities":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <ListEditor
            label="Amenities"
            items={content.items || []}
            onChange={(items) => set("items", items)}
            newItem={{ name: "", description: "" }}
            fields={[{ key: "name", label: "Amenity Name" }, { key: "description", label: "Description" }]}
          />
        </>
      );
    case "retail-products":
      return (
        <>
          <TextField label="Heading" value={content.heading || ""} onChange={(v) => set("heading", v)} />
          <RetailCategoryPicker organizationId={organizationId} value={content.categoryId || ""} onChange={(v) => set("categoryId", v)} />
          <p className="text-xs text-slate-400">
            Shows your live products &amp; prices from Products &amp; Inventory — no need to re-type them here. Manage what's for sale from the ShopOS dashboard.
          </p>
        </>
      );
    default:
      return null;
  }
}

// Self-fetches this org's Retail categories so the product-catalog section
// can filter to one category — keeps live-catalog concerns out of the
// generic section-form plumbing above.
function RetailCategoryPicker({ organizationId, value, onChange }: { organizationId: string; value: string; onChange: (v: string) => void }) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    import("@/lib/actions/retail").then(({ getCategories }) => getCategories(organizationId).then(setCategories));
  }, [organizationId]);

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">Category (optional)</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All Categories</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}

function ListEditor({ label, items, onChange, newItem, fields }: {
  label: string;
  items: any[];
  onChange: (items: any[]) => void;
  newItem: any;
  fields: { key: string; label: string; textarea?: boolean }[];
}) {
  const update = (i: number, key: string, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: value };
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { ...newItem }]);

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1.5 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2 relative">
            <button onClick={() => remove(i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-600"><X size={14} /></button>
            {fields.map((f) =>
              f.textarea ? (
                <textarea
                  key={f.key}
                  value={item[f.key] || ""}
                  onChange={(e) => update(i, f.key, e.target.value)}
                  placeholder={f.label}
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              ) : (
                <input
                  key={f.key}
                  value={item[f.key] || ""}
                  onChange={(e) => update(i, f.key, e.target.value)}
                  placeholder={f.label}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              )
            )}
          </div>
        ))}
        <button onClick={add} className="text-xs font-semibold text-blue-600 hover:text-blue-800">+ Add</button>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AssetPicker({ label, organizationId, assetId, onChange }: {
  label: string; organizationId: string; assetId: string | null; onChange: (id: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await uploadAsset(organizationId, { fileName: file.name, mimeType, base64Data: base64 });
      if ((res as any)?.error) { setError((res as any).error); return; }
      onChange((res as any).assetId);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</label>
      {error && <div className="mb-2"><ErrorBanner text={error} /></div>}
      <div className="flex items-center gap-3">
        {assetId ? (
          <img src={assetId.startsWith("http") ? assetId : `/api/assets/${assetId}`} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300"><Upload size={18} /></div>
        )}
        <label className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
          {uploading ? <Loader2 size={14} className="animate-spin inline" /> : (assetId ? "Replace" : "Upload")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
        {assetId && <button onClick={() => onChange(null)} className="text-xs font-semibold text-slate-400 hover:text-red-600">Remove</button>}
      </div>
    </div>
  );
}

function GalleryPicker({ organizationId, imageAssetIds, onChange }: {
  organizationId: string; imageAssetIds: string[]; onChange: (ids: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: File[]) => {
    setUploading(true);
    try {
      const newIds: string[] = [];
      for (const file of files) {
        const { base64, mimeType } = await fileToBase64(file);
        const res = await uploadAsset(organizationId, { fileName: file.name, mimeType, base64Data: base64 });
        if ((res as any)?.assetId) {
          newIds.push((res as any).assetId);
        }
      }
      if (newIds.length > 0) {
        onChange([...imageAssetIds, ...newIds]);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1.5 block">Images</label>
      <div className="flex flex-wrap gap-2">
        {imageAssetIds.map((id) => (
          <div key={id} className="relative">
            <img src={id.startsWith("http") ? id : `/api/assets/${id}`} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
            <button
              onClick={() => onChange(imageAssetIds.filter((i) => i !== id))}
              className="absolute -top-1.5 -right-1.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-600 shadow-sm"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <label className="w-16 h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300 hover:text-slate-500 cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(Array.from(e.target.files));
            }
          }} />
        </label>
      </div>
    </div>
  );
}

// =====================================================================
// Shared bits
// =====================================================================

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSubmit, disabled, isSaving, label }: { onCancel: () => void; onSubmit: () => void; disabled: boolean; isSaving: boolean; label: string }) {
  return (
    <div className="pt-2 flex gap-3">
      <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
        Cancel
      </button>
      <button onClick={onSubmit} disabled={disabled} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
        {isSaving ? "Saving..." : label}
      </button>
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{text}</div>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
