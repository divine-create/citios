"use client";

import React, { useEffect, useRef, useState } from "react";
import { THEMES, DEFAULT_THEME } from "./themes";
import { submitInquiry } from "@/lib/actions/microsite";
import { Menu, X } from "lucide-react";
import HotelBookingWidget from "./HotelBookingWidget";

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: "50px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const assetUrl = (assetId: string | null | undefined) => {
  if (!assetId) return null;
  if (assetId.startsWith("http")) return assetId;
  return `/api/assets/${assetId}`;
};

function ContactForm({ micrositeId, theme }: { micrositeId: string; theme: any }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    const fd = new FormData(e.currentTarget);
    const res = await submitInquiry(micrositeId, fd.get("name") as string, fd.get("email") as string, fd.get("message") as string);
    if (res.error) setStatus("error");
    else setStatus("success");
  };

  if (status === "success") {
    return <div style={{ padding: "2rem", background: theme.bg, borderRadius: theme.radius, color: theme.accent, fontWeight: "bold" }}>Thank you! Your message has been sent.</div>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "400px", margin: "0 auto", textAlign: "left" }}>
      <div>
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.5rem", fontWeight: 600 }}>Name</label>
        <input name="name" required style={{ width: "100%", padding: "0.75rem", borderRadius: theme.radius, border: `1px solid ${theme.surface}`, background: theme.bg, color: theme.text }} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.5rem", fontWeight: 600 }}>Email</label>
        <input name="email" type="email" required style={{ width: "100%", padding: "0.75rem", borderRadius: theme.radius, border: `1px solid ${theme.surface}`, background: theme.bg, color: theme.text }} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.5rem", fontWeight: 600 }}>Message</label>
        <textarea name="message" required rows={4} style={{ width: "100%", padding: "0.75rem", borderRadius: theme.radius, border: `1px solid ${theme.surface}`, background: theme.bg, color: theme.text }} />
      </div>
      <button disabled={status === "submitting"} style={{ marginTop: "1rem", padding: "1rem", background: theme.accent, color: theme.accentText, border: "none", borderRadius: theme.radius, fontWeight: "bold", cursor: "pointer", opacity: status === "submitting" ? 0.7 : 1 }}>
        {status === "submitting" ? "Sending..." : "Send Message"}
      </button>
      {status === "error" && <div style={{ color: "red", fontSize: "0.9rem", marginTop: "0.5rem" }}>Something went wrong. Please try again.</div>}
    </form>
  );
}

interface RetailProductSummary {
  id: string;
  name: string;
  price: number;
  categoryId: string | null;
  categoryName: string | null;
  isWeighed: boolean;
  unit: string;
  stockQuantity: number;
  imageAssetId: string | null;
}

export interface MicrositeData {
  id: string;
  organizationId: string;
  slug: string;
  title: string;
  tagline?: string | null;
  theme: string;
  organizationName: string;
  logoAssetId?: string | null;
  sections: { id: string; type: string; content: string; visible: boolean }[];
  navItems?: { id: string; label: string; url: string | null; pageId: string | null; page?: { slug: string, isHome: boolean } }[];
  products?: RetailProductSummary[];
  hotelRooms?: any[];
  currencySymbol?: string | null;
  primaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: string;
}

export default function MicrositeRenderer({ data }: { data: MicrositeData }) {
  const baseTheme = THEMES[data.theme] ?? THEMES[DEFAULT_THEME];
  
  const customTheme = {
    ...baseTheme,
    ...(data.primaryColor ? { bg: data.primaryColor === '#2563EB' ? baseTheme.bg : '#ffffff' } : {}), // Keep mostly defaults for bg unless specified
    accent: data.accentColor ?? baseTheme.accent,
    headingFont: data.headingFont === 'inter' ? baseTheme.headingFont : (data.headingFont ?? baseTheme.headingFont),
    bodyFont: data.bodyFont === 'inter' ? baseTheme.bodyFont : (data.bodyFont ?? baseTheme.bodyFont),
    radius: data.borderRadius === 'none' ? '0' : data.borderRadius === 'sm' ? '0.25rem' : data.borderRadius === 'md' ? '0.5rem' : data.borderRadius === 'lg' ? '1rem' : data.borderRadius === 'full' ? '9999px' : baseTheme.radius,
  };
  
  const theme = customTheme;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Use dynamic navItems if they exist, otherwise fallback to sections for backwards compatibility
  const navLinks = data.navItems && data.navItems.length > 0 
    ? data.navItems.map(n => {
        let resolvedUrl = '#';
        if (n.url) {
          resolvedUrl = n.url;
        } else if (n.page) {
          resolvedUrl = n.page.isHome ? `/site/${data.slug}` : `/site/${data.slug}/${n.page.slug}`;
        }
        return { id: n.id, label: n.label, url: resolvedUrl };
      })
    : data.sections
    .filter((s) => s.visible && s.type !== "hero" && s.type !== "footer" && s.type !== "cta")
    .map((s) => {
      try {
        const content = JSON.parse(s.content);
        return content.heading ? { id: s.id, label: content.heading, url: `#${s.id}` } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { id: string; label: string, url: string }[];

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: theme.bodyFont, minHeight: "100vh" }}>
      <style>{`
        html { scroll-behavior: smooth; }
        .site-header { flex-direction: row; }
        .hero-heading { font-size: 3.5rem; }
        .hero-section { padding: 5rem 1.5rem; min-height: 70vh; }
        .gallery-image { height: 24rem; }
        .contact-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .section-padding { padding: 6rem 1.5rem; }
        .footer-padding { padding: 4rem 1.5rem; }
        .desktop-nav { display: flex; }
        .mobile-nav-toggle { display: none; }
        .mobile-nav-menu { display: none; }
        
        @media (max-width: 768px) {
          .site-header { flex-direction: row !important; align-items: center !important; flex-wrap: wrap; gap: 0 !important; }
          .desktop-nav { display: none !important; }
          .mobile-nav-toggle { display: block !important; }
          .mobile-nav-menu { display: flex !important; flex-basis: 100%; flex-direction: column; gap: 1rem; padding-top: 1rem; margin-top: 1rem; border-top: 1px solid ${theme.surface}; }
          
          .hero-heading { font-size: 2.5rem !important; }
          .hero-section { padding: 3rem 1.5rem !important; min-height: 50vh !important; }
          .gallery-image { height: 16rem !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .section-padding { padding: 3rem 1.5rem !important; }
          .footer-padding { padding: 2rem 1.5rem !important; }
        }
      `}</style>
      <header className="site-header" style={{ position: "sticky", top: 0, zIndex: 50, background: theme.bg, borderBottom: `1px solid ${theme.surface}`, padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <div style={{ fontWeight: 800, fontSize: "1.25rem", color: theme.text, fontFamily: theme.headingFont, display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {data.logoAssetId && <img src={assetUrl(data.logoAssetId)!} alt="Logo" style={{ height: "2rem", width: "auto" }} />}
          {data.title}
        </div>
        
        <button 
          className="mobile-nav-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: "transparent", border: "none", color: theme.text, cursor: "pointer", padding: "0.5rem" }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className="desktop-nav" style={{ gap: "1.5rem" }}>
          {navLinks.map((link) => (
            <a key={link.id} href={link.url} style={{ color: theme.textMuted, textDecoration: "none", fontSize: "0.95rem", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)} onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}>
              {link.label}
            </a>
          ))}
        </nav>

        {isMobileMenuOpen && (
          <nav className="mobile-nav-menu">
            {navLinks.map((link) => (
              <a 
                key={link.id} 
                href={link.url} 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ color: theme.text, textDecoration: "none", fontSize: "1.1rem", fontWeight: 500, padding: "0.5rem 0" }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {data.sections.map((section) => {
        let content: any = {};
        try {
          content = JSON.parse(section.content);
        } catch {
          content = {};
        }
        return <Section key={section.id} id={section.id} micrositeId={data.id} type={section.type} content={content} theme={theme} products={data.products ?? []} hotelRooms={data.hotelRooms ?? []} currency={data.currencySymbol ?? "$"} />;
      })}
      <div style={{ textAlign: "center", padding: "1.5rem", fontSize: "0.75rem", color: theme.textMuted, borderTop: `1px solid ${theme.surface}` }}>
        Powered by CityConnect
      </div>
    </div>
  );
}

function Section({ id, micrositeId, type, content, theme, products, hotelRooms, currency }: { id: string; micrositeId: string; type: string; content: any; theme: typeof THEMES[string]; products: RetailProductSummary[], hotelRooms?: any[]; currency?: string }) {
  const currencySymbol = currency ?? "$";
  const headingStyle: React.CSSProperties = { fontFamily: theme.headingFont, color: theme.text };
  const isLuxury = theme.label === "Horizon (Hotel)";
  const isSchoolTheme = theme.label.includes("School") || theme.label.includes("Elementary") || theme.label.includes("Innovator") || theme.label.includes("Scholastic") || theme.label.includes("Academy") || theme.label.includes("Prestige");
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const catalogCategories = Array.from(new Set(products.map((product) => product.categoryName).filter(Boolean))) as string[];

  switch (type) {
    case "hero":
      return (
        <section
          id={id}
          className="hero-section"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: isSchoolTheme ? "left" : "center",
            minHeight: isLuxury ? "85vh" : isSchoolTheme ? "75vh" : "auto",
            padding: isLuxury ? "0" : "8rem 2rem",
            backgroundImage: content.imageAssetId ? `url(${assetUrl(content.imageAssetId)})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: isSchoolTheme ? "scroll" : "fixed",
            backgroundColor: theme.surface,
          }}
        >
          {content.imageAssetId && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: isLuxury ? "rgba(0,0,0,0.6)" : isSchoolTheme ? "rgba(15, 23, 42, 0.7)" : "rgba(0,0,0,0.5)", zIndex: 0 }} />
          )}
          <FadeIn>
            <div style={{ position: "relative", zIndex: 1, maxWidth: "72rem", margin: "0 auto", padding: isSchoolTheme ? "0" : "4rem 2rem", width: "100%", display: isSchoolTheme ? "flex" : "block", flexDirection: "column", alignItems: "flex-start" }}>
              {isSchoolTheme && content.heading && (
                 <div style={{ width: "60px", height: "4px", backgroundColor: theme.accent, marginBottom: "2rem", borderRadius: "2px" }} />
              )}
              {content.heading && (
                <h1 style={{ ...headingStyle, fontSize: isLuxury ? "5rem" : isSchoolTheme ? "4.5rem" : "3.5rem", fontWeight: isLuxury ? 300 : isSchoolTheme ? 800 : 800, letterSpacing: isLuxury ? "0.02em" : "-0.02em", marginBottom: "1.5rem", color: content.imageAssetId ? "#fff" : theme.text, lineHeight: 1.1, maxWidth: isSchoolTheme ? "48rem" : "100%" }}>
                  {content.heading}
                </h1>
              )}
              {content.subheading && (
                <p style={{ fontSize: isLuxury ? "1.25rem" : isSchoolTheme ? "1.35rem" : "1.25rem", fontWeight: isSchoolTheme ? 400 : 300, color: content.imageAssetId ? "rgba(255,255,255,0.9)" : theme.textMuted, marginBottom: "2.5rem", maxWidth: isSchoolTheme ? "36rem" : "40rem", margin: isSchoolTheme ? "0 0 2.5rem 0" : "0 auto 2.5rem" }}>
                  {content.subheading}
                </p>
              )}
              {content.ctaText && (
                <a href={content.ctaLink || "#"} style={{ display: "inline-block", padding: isLuxury ? "1rem 3rem" : isSchoolTheme ? "1.125rem 2.5rem" : "1rem 2rem", backgroundColor: theme.accent, color: theme.accentText, fontWeight: isLuxury ? 500 : 700, borderRadius: theme.radius, textDecoration: "none", transition: "all 0.2s", textTransform: isLuxury ? "uppercase" : "none", letterSpacing: isLuxury ? "0.1em" : "normal", fontSize: isSchoolTheme ? "1rem" : "0.875rem", boxShadow: isSchoolTheme ? "0 10px 25px rgba(0,0,0,0.2)" : "none" }}>
                  {content.ctaText}
                </a>
              )}
            </div>
          </FadeIn>
        </section>
      );

    case "about":
      return (
        <section id={id} className="section-padding" style={{ maxWidth: "64rem", margin: "0 auto" }}>
          <FadeIn>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4rem", alignItems: "center" }}>
              {content.imageAssetId && (
                <div style={{ flex: "1 1 300px" }}>
                  <img src={assetUrl(content.imageAssetId)!} alt="" style={{ width: "100%", borderRadius: theme.radius, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }} />
                </div>
              )}
              <div style={{ flex: "1 1 300px" }}>
                {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>{content.heading}</h2>}
                {content.body && <p style={{ color: theme.textMuted, fontSize: "1.1rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{content.body}</p>}
              </div>
            </div>
          </FadeIn>
        </section>
      );

    case "services": {
      const items: any[] = Array.isArray(content.items) ? content.items : [];
      return (
        <section id={id} className="section-padding" style={{ background: theme.surface }}>
          <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
            <FadeIn>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "3rem", textAlign: "center" }}>{content.heading}</h2>}
            </FadeIn>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
              {items.map((item, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div style={{ background: theme.bg, padding: "2rem", borderRadius: theme.radius, height: "100%", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ ...headingStyle, fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>{item.title}</h3>
                    <p style={{ color: theme.textMuted, fontSize: "1rem", lineHeight: 1.6 }}>{item.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "gallery": {
      const ids: string[] = Array.isArray(content.imageAssetIds) ? content.imageAssetIds : [];
      return (
        <section id={id} className="section-padding" style={{ overflow: "hidden" }}>
          <FadeIn>
            {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "3rem", textAlign: "center", padding: "0 1.5rem" }}>{content.heading}</h2>}
            <div style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", gap: "1.5rem", padding: "0 1.5rem 2rem", scrollbarWidth: "none" }}>
              {ids.map((id) => (
                <div key={id} style={{ flex: "0 0 80%", maxWidth: "600px", scrollSnapAlign: "center" }}>
                  <img src={assetUrl(id)!} alt="" className="gallery-image" style={{ width: "100%", objectFit: "cover", borderRadius: theme.radius, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }} />
                </div>
              ))}
            </div>
          </FadeIn>
        </section>
      );
    }

    case "hours": {
      const rows: any[] = Array.isArray(content.rows) ? content.rows : [];
      return (
        <section id={id} className="section-padding" style={{ background: theme.surface }}>
          <FadeIn>
            <div style={{ maxWidth: "32rem", margin: "0 auto", background: theme.bg, padding: "3rem", borderRadius: theme.radius, boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.25rem", fontWeight: 700, marginBottom: "2rem", textAlign: "center" }}>{content.heading}</h2>}
              <div>
                {rows.map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: i === rows.length - 1 ? "none" : `1px solid ${theme.surface}` }}>
                    <span style={{ fontWeight: 600 }}>{row.day}</span>
                    <span style={{ color: theme.textMuted }}>{row.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </section>
      );
    }

    case "testimonials": {
      const items: any[] = Array.isArray(content.items) ? content.items : [];
      return (
        <section id={id} className="section-padding">
          <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
            <FadeIn>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "3rem", textAlign: "center" }}>{content.heading}</h2>}
            </FadeIn>
            <div style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", gap: "2rem", paddingBottom: "2rem", scrollbarWidth: "none" }}>
              {items.map((item, i) => (
                <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "center" }}>
                  <FadeIn delay={100}>
                    <div style={{ background: theme.surface, padding: "3rem", borderRadius: theme.radius, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                      <p style={{ fontStyle: "italic", marginBottom: "1.5rem", lineHeight: 1.8, fontSize: "1.25rem" }}>&ldquo;{item.quote}&rdquo;</p>
                      <p style={{ color: theme.textMuted, fontWeight: 700, fontSize: "1rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>— {item.author}</p>
                    </div>
                  </FadeIn>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "contact":
      return (
        <section id={id} className="section-padding" style={{ background: theme.surface, position: "relative" }}>
          {isSchoolTheme && (
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "50%", height: "50%", background: `radial-gradient(circle at 100% 100%, ${theme.accent}10 0%, transparent 50%)`, pointerEvents: "none" }} />
          )}
          <FadeIn>
            <div className="contact-grid" style={{ maxWidth: "72rem", margin: "0 auto", display: "grid", gap: "5rem", position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {isSchoolTheme && (
                  <div style={{ width: "40px", height: "4px", backgroundColor: theme.accent, marginBottom: "2rem", borderRadius: "2px" }} />
                )}
                {content.heading && <h2 style={{ ...headingStyle, fontSize: "3rem", fontWeight: 700, marginBottom: "2.5rem" }}>{content.heading}</h2>}
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  {content.address && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                       <div style={{ padding: "1rem", background: theme.bg, borderRadius: "50%", color: theme.accent, boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                       </div>
                       <div style={{ paddingTop: "0.5rem" }}>
                         <p style={{ fontWeight: 600, color: theme.text, marginBottom: "0.25rem", fontSize: "1.1rem" }}>Visit Us</p>
                         <p style={{ color: theme.textMuted, lineHeight: 1.6, fontSize: "1.05rem" }}>{content.address}</p>
                       </div>
                    </div>
                  )}
                  {content.phone && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                       <div style={{ padding: "1rem", background: theme.bg, borderRadius: "50%", color: theme.accent, boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                       </div>
                       <div style={{ paddingTop: "0.5rem" }}>
                         <p style={{ fontWeight: 600, color: theme.text, marginBottom: "0.25rem", fontSize: "1.1rem" }}>Call Us</p>
                         <p style={{ color: theme.textMuted, lineHeight: 1.6, fontSize: "1.05rem" }}>{content.phone}</p>
                       </div>
                    </div>
                  )}
                  {content.email && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                       <div style={{ padding: "1rem", background: theme.bg, borderRadius: "50%", color: theme.accent, boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                       </div>
                       <div style={{ paddingTop: "0.5rem" }}>
                         <p style={{ fontWeight: 600, color: theme.text, marginBottom: "0.25rem", fontSize: "1.1rem" }}>Email</p>
                         <p style={{ color: theme.textMuted, lineHeight: 1.6, fontSize: "1.05rem" }}>{content.email}</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ background: theme.bg, padding: "3rem", borderRadius: theme.radius, boxShadow: "0 20px 40px rgba(0,0,0,0.05)" }}>
                <h3 style={{ ...headingStyle, fontSize: "1.75rem", fontWeight: 700, marginBottom: "2rem" }}>Send us a message</h3>
                <ContactForm micrositeId={micrositeId} theme={theme} />
              </div>
            </div>
          </FadeIn>
        </section>
      );

    case "cta":
      return (
        <section id={id} className="section-padding" style={{ textAlign: "center", background: theme.accent, color: theme.accentText }}>
          <FadeIn>
            <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "3rem", fontWeight: 800, marginBottom: "1.5rem", color: theme.accentText }}>{content.heading}</h2>}
              {content.body && <p style={{ marginBottom: "2.5rem", fontSize: "1.25rem", opacity: 0.9, lineHeight: 1.6 }}>{content.body}</p>}
              {content.buttonText && (
                <a
                  href={content.buttonLink || "#"}
                  style={{ display: "inline-block", background: theme.accentText, color: theme.accent, padding: "1.25rem 3rem", borderRadius: theme.radius, fontWeight: 700, textDecoration: "none", fontSize: "1.1rem", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                >
                  {content.buttonText}
                </a>
              )}
            </div>
          </FadeIn>
        </section>
      );

    case "footer": {
      const links: any[] = Array.isArray(content.socialLinks) ? content.socialLinks : [];
      return (
        <footer className="footer-padding" style={{ textAlign: "center", borderTop: `1px solid ${theme.surface}` }}>
          <FadeIn>
            {content.tagline && <p style={{ color: theme.textMuted, marginBottom: "1.5rem", fontSize: "1rem" }}>{content.tagline}</p>}
            {links.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "2rem" }}>
                {links.map((link, i) => (
                  <a key={i} href={link.url} style={{ color: theme.text, fontSize: "0.95rem", fontWeight: 500, textDecoration: "none" }}>{link.label}</a>
                ))}
              </div>
            )}
          </FadeIn>
        </footer>
      );
    }

    case "school-admissions-timeline": {
      const steps: any[] = Array.isArray(content.steps) ? content.steps : [];
      return (
        <section id={id} className="section-padding" style={{ background: theme.surface }}>
          <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
            <FadeIn>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "4rem", textAlign: "center" }}>{content.heading}</h2>}
            </FadeIn>
            <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
              {steps.map((step, i) => (
                <FadeIn key={i} delay={i * 150}>
                  <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0, width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: theme.accent, color: theme.accentText, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.25rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                      {i + 1}
                    </div>
                    <div style={{ paddingTop: "0.5rem" }}>
                      <h3 style={{ ...headingStyle, fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.5rem" }}>{step.title}</h3>
                      <p style={{ color: theme.textMuted, lineHeight: 1.7, fontSize: "1.05rem" }}>{step.description}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "school-curriculum": {
      const items: any[] = Array.isArray(content.items) ? content.items : [];
      return (
        <section id={id} className="section-padding">
          <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
            <FadeIn>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "4rem", textAlign: "center" }}>{content.heading}</h2>}
            </FadeIn>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2.5rem" }}>
              {items.map((item, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div style={{ background: theme.surface, padding: "3rem 2.5rem", borderRadius: theme.radius, position: "relative", overflow: "hidden", height: "100%", boxShadow: isSchoolTheme ? "0 10px 40px rgba(0,0,0,0.03)" : "0 10px 30px rgba(0,0,0,0.05)", border: isSchoolTheme ? "none" : `4px solid ${theme.accent}` }}>
                    {isSchoolTheme && (
                      <div style={{ position: "absolute", top: "-1rem", right: "-1rem", fontSize: "8rem", fontWeight: 900, color: theme.accent, opacity: 0.05, lineHeight: 1, zIndex: 0, pointerEvents: "none" }}>
                        {(i + 1).toString().padStart(2, '0')}
                      </div>
                    )}
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <h3 style={{ ...headingStyle, fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>{item.phase}</h3>
                      <p style={{ color: theme.textMuted, lineHeight: 1.7, fontSize: "1.1rem" }}>{item.description}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "school-head-welcome": {
      return (
        <section id={id} className="section-padding" style={{ background: theme.surface, position: "relative", overflow: "hidden" }}>
          {isSchoolTheme && (
             <div style={{ position: "absolute", top: 0, left: 0, width: "30%", height: "100%", background: theme.bg, borderRight: `1px solid ${theme.accent}20` }} />
          )}
          <FadeIn>
            <div style={{ maxWidth: "72rem", margin: "0 auto", position: "relative", zIndex: 1, display: "flex", flexDirection: isSchoolTheme ? "row" : "column", alignItems: "center", gap: isSchoolTheme ? "5rem" : "0", textAlign: isSchoolTheme ? "left" : "center" }}>
              {content.imageAssetId && (
                <div style={{ flexShrink: 0, width: isSchoolTheme ? "24rem" : "10rem", marginBottom: isSchoolTheme ? "0" : "2.5rem", position: "relative" }}>
                  {isSchoolTheme && (
                    <div style={{ position: "absolute", inset: "-1rem", border: `2px solid ${theme.accent}`, borderRadius: theme.radius, transform: "translate(-1rem, 1rem)" }} />
                  )}
                  <img
                    src={assetUrl(content.imageAssetId)!}
                    alt={content.signature}
                    style={{ width: "100%", height: isSchoolTheme ? "28rem" : "10rem", borderRadius: isSchoolTheme ? theme.radius : "50%", objectFit: "cover", position: "relative", zIndex: 2, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}
                  />
                </div>
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: isSchoolTheme ? "flex-start" : "center" }}>
                {isSchoolTheme && (
                  <div style={{ color: theme.accent, fontSize: "4rem", lineHeight: 0, opacity: 0.2, marginBottom: "1rem", fontFamily: "serif" }}>&ldquo;</div>
                )}
                {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.25rem", fontWeight: 700, marginBottom: "2rem" }}>{content.heading}</h2>}
                {content.body && <p style={{ color: theme.text, fontSize: isSchoolTheme ? "1.25rem" : "1.35rem", fontStyle: isSchoolTheme ? "normal" : "italic", lineHeight: 1.8, marginBottom: "2.5rem", maxWidth: "48rem" }}>{isSchoolTheme ? "" : "\u201c"}{content.body}{isSchoolTheme ? "" : "\u201d"}</p>}
                {content.signature && (
                  <div style={{ borderTop: isSchoolTheme ? `2px solid ${theme.accent}30` : "none", paddingTop: isSchoolTheme ? "1.5rem" : "0", width: isSchoolTheme ? "auto" : "100%" }}>
                    <p style={{ ...headingStyle, fontWeight: 700, fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: theme.accent }}>{content.signature}</p>
                    {isSchoolTheme && <p style={{ color: theme.textMuted, fontSize: "0.9rem", marginTop: "0.25rem" }}>Head of School</p>}
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        </section>
      );
    }

    case "hotel-rooms": {
      const items: any[] = Array.isArray(content.items) ? content.items : [];
      const isLuxury = theme.label === "Horizon (Hotel)";
      return (
        <section id={id} className="section-padding">
          <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
            <FadeIn>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: isLuxury ? "3rem" : "2.5rem", fontWeight: isLuxury ? 300 : 700, letterSpacing: isLuxury ? "0.05em" : "normal", marginBottom: "4rem", textAlign: "center" }}>{content.heading}</h2>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: isLuxury ? "4rem" : "2rem" }}>
                {items.map((room, i) => (
                  <div key={i} style={{ background: isLuxury ? "transparent" : theme.surface, borderRadius: isLuxury ? "0" : theme.radius, overflow: "hidden", boxShadow: isLuxury ? "none" : "0 10px 30px rgba(0,0,0,0.05)" }}>
                    <div style={{ height: isLuxury ? "400px" : "240px", backgroundColor: theme.surface, backgroundImage: room.imageAssetId ? `url(${assetUrl(room.imageAssetId)})` : "none", backgroundSize: "cover", backgroundPosition: "center" }} />
                    <div style={{ padding: isLuxury ? "2rem 0" : "1.5rem" }}>
                      <h3 style={{ ...headingStyle, fontSize: "1.5rem", fontWeight: isLuxury ? 400 : 600, marginBottom: "0.5rem" }}>{room.name || "Room Name"}</h3>
                      <p style={{ color: theme.textMuted, fontSize: "0.875rem", lineHeight: 1.6 }}>{room.description || "Room description"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      );
    }
    case "hotel-feature": {
      const isLuxury = theme.label === "Horizon (Hotel)";
      const isReverse = !!content.reverseLayout;
      return (
        <section id={id} className="section-padding" style={{ background: theme.bg }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: isLuxury ? "4rem 0" : "0" }}>
            <FadeIn>
              <div style={{ display: "flex", flexWrap: "wrap", flexDirection: isReverse ? "row-reverse" : "row", alignItems: "center", gap: "4rem" }}>
                <div style={{ flex: "1 1 400px" }}>
                  {content.imageAssetId ? (
                    <img src={assetUrl(content.imageAssetId)!} alt="" style={{ width: "100%", height: isLuxury ? "600px" : "auto", objectFit: "cover", borderRadius: isLuxury ? "0" : theme.radius, boxShadow: isLuxury ? "none" : "0 20px 40px rgba(0,0,0,0.1)" }} />
                  ) : (
                    <div style={{ width: "100%", height: "400px", background: theme.surface, borderRadius: theme.radius }} />
                  )}
                </div>
                <div style={{ flex: "1 1 400px", padding: isLuxury ? "2rem" : "0" }}>
                  {content.subheading && <p style={{ color: theme.accent, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, fontSize: "0.875rem", marginBottom: "1rem" }}>{content.subheading}</p>}
                  {content.heading && <h2 style={{ ...headingStyle, fontSize: isLuxury ? "3.5rem" : "2.5rem", fontWeight: isLuxury ? 300 : 700, marginBottom: "1.5rem", lineHeight: 1.1 }}>{content.heading}</h2>}
                  {content.body && <p style={{ color: theme.textMuted, fontSize: "1.125rem", lineHeight: 1.8 }}>{content.body}</p>}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      );
    }

    case "school-events": {
      const items: any[] = Array.isArray(content.items) ? content.items : [];
      return (
        <section id={id} className="section-padding" style={{ background: theme.bg }}>
          <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
            <FadeIn>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem", textAlign: "center" }}>{content.heading}</h2>}
              {content.subtext && <p style={{ color: theme.textMuted, fontSize: "1.1rem", textAlign: "center", marginBottom: "3rem" }}>{content.subtext}</p>}
            </FadeIn>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
              {items.map((item, i) => (
                <FadeIn key={i} delay={i * 50}>
                  <div style={{ padding: "2rem", background: theme.surface, borderRadius: theme.radius, boxShadow: "0 4px 15px rgba(0,0,0,0.03)", height: "100%", display: "flex", flexDirection: "column" }}>
                    <div style={{ color: theme.accent, fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>{item.date}</div>
                    <h3 style={{ ...headingStyle, fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>{item.title}</h3>
                    <p style={{ color: theme.textMuted, fontSize: "0.95rem", lineHeight: 1.6, flexGrow: 1 }}>{item.description}</p>
                  </div>
                </FadeIn>
              ))}
              {items.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4rem 2rem", background: theme.surface, borderRadius: theme.radius, color: theme.textMuted }}>
                  <p>Check back soon for our upcoming academic calendar.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "hotel-booking": {
      const isLuxury = theme.label === "Horizon (Hotel)";
      return (
        <section id={id} className="section-padding" style={{ position: "relative", zIndex: 10, marginTop: isLuxury ? "-6rem" : "0", paddingBottom: "4rem", paddingTop: isLuxury ? "0" : "4rem" }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
            <FadeIn>
              <HotelBookingWidget theme={theme} heading={content.heading} subtext={content.subtext} availableRooms={hotelRooms} />
            </FadeIn>
          </div>
        </section>
      );
    }

    case "hotel-amenities": {
      const items: any[] = Array.isArray(content.items) ? content.items : [];
      return (
        <section id={id} className="section-padding" style={{ background: theme.surface }}>
          <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
            <FadeIn>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "4rem", textAlign: "center" }}>{content.heading}</h2>}
            </FadeIn>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
              {items.map((item, i) => (
                <FadeIn key={i} delay={i * 50}>
                  <div style={{ padding: "2rem", background: theme.bg, borderRadius: theme.radius, textAlign: "center", height: "100%", boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
                    <h3 style={{ ...headingStyle, fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem", color: theme.accent }}>{item.name}</h3>
                    <p style={{ color: theme.textMuted, fontSize: "0.95rem", lineHeight: 1.6 }}>{item.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "retail-products": {
      const filtered = products.filter((product) => {
        const matchesSection = content.categoryId ? product.categoryId === content.categoryId : true;
        const matchesCategory = catalogCategory ? product.categoryName === catalogCategory : true;
        const query = catalogQuery.trim().toLowerCase();
        const matchesQuery = !query || product.name.toLowerCase().includes(query) || (product.categoryName ?? '').toLowerCase().includes(query);
        return matchesSection && matchesCategory && matchesQuery;
      });
      return (
        <section id={id} className="section-padding">
          <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
            <FadeIn>
              {content.heading && <h2 style={{ ...headingStyle, fontSize: "2.5rem", fontWeight: 700, marginBottom: "3rem", textAlign: "center" }}>{content.heading}</h2>}
            </FadeIn>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "2rem" }}>
              <input
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                style={{ flex: "1 1 14rem", minWidth: "12rem", padding: "0.75rem 1rem", borderRadius: theme.radius, border: `1px solid ${theme.surface}`, background: theme.bg, color: theme.text }}
              />
              {catalogCategories.length > 0 && (
                <select
                  value={catalogCategory}
                  onChange={(event) => setCatalogCategory(event.target.value)}
                  aria-label="Filter products by category"
                  style={{ flex: "0 1 14rem", padding: "0.75rem 1rem", borderRadius: theme.radius, border: `1px solid ${theme.surface}`, background: theme.bg, color: theme.text }}
                >
                  <option value="">All categories</option>
                  {catalogCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              )}
            </div>
            {filtered.length === 0 ? (
              <p style={{ textAlign: "center", color: theme.textMuted }}>No products to show yet — check back soon.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem" }}>
                {filtered.map((product, i) => {
                  const outOfStock = !product.isWeighed && product.stockQuantity <= 0;
                  return (
                    <FadeIn key={product.id} delay={i * 60}>
                      <div style={{ borderRadius: theme.radius, overflow: "hidden", background: theme.surface, boxShadow: "0 10px 30px rgba(0,0,0,0.05)", opacity: outOfStock ? 0.6 : 1 }}>
                        <div style={{ aspectRatio: "1 / 1", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {product.imageAssetId ? (
                            <img src={assetUrl(product.imageAssetId)!} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ color: theme.textMuted, fontSize: "0.85rem" }}>No photo</span>
                          )}
                        </div>
                        <div style={{ padding: "1.25rem" }}>
                          <h3 style={{ ...headingStyle, fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.35rem" }}>{product.name}</h3>
                          <p style={{ color: theme.accent, fontWeight: 700, fontSize: "1.1rem" }}>
                            {currencySymbol}{product.price.toFixed(2)}{product.isWeighed ? ` / ${product.unit}` : ""}
                          </p>
                          {outOfStock && <p style={{ color: theme.textMuted, fontSize: "0.8rem", fontWeight: 600, marginTop: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Out of Stock</p>}
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}
