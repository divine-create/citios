export interface MicrositeTheme {
  label: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  headingFont: string;
  bodyFont: string;
  radius: string;
}

export const THEMES: Record<string, MicrositeTheme> = {
  minimal: {
    label: "Minimal",
    bg: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    textMuted: "#64748b",
    accent: "#0f172a",
    accentText: "#ffffff",
    headingFont: "ui-sans-serif, system-ui, sans-serif",
    bodyFont: "ui-sans-serif, system-ui, sans-serif",
    radius: "0.5rem",
  },
  bold: {
    label: "Bold",
    bg: "#0f172a",
    surface: "#1e293b",
    text: "#f8fafc",
    textMuted: "#94a3b8",
    accent: "#f97316",
    accentText: "#0f172a",
    headingFont: "ui-sans-serif, system-ui, sans-serif",
    bodyFont: "ui-sans-serif, system-ui, sans-serif",
    radius: "0.75rem",
  },
  warm: {
    label: "Warm",
    bg: "#fffbeb",
    surface: "#fef3c7",
    text: "#451a03",
    textMuted: "#92400e",
    accent: "#b45309",
    accentText: "#ffffff",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "ui-sans-serif, system-ui, sans-serif",
    radius: "1rem",
  },
  editorial: {
    label: "Editorial",
    bg: "#ffffff",
    surface: "#f5f5f4",
    text: "#1c1917",
    textMuted: "#78716c",
    accent: "#1c1917",
    accentText: "#ffffff",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Georgia, 'Times New Roman', serif",
    radius: "0px",
  },
  academy: {
    label: "The Academy (School)",
    bg: "#ffffff",
    surface: "#f8f9fa",
    text: "#1e293b",
    textMuted: "#475569",
    accent: "#881337", // Crimson
    accentText: "#ffffff",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: "0.25rem",
  },
  innovator: {
    label: "The Innovator",
    bg: "#fafafa",
    surface: "#ffffff",
    text: "#09090b",
    textMuted: "#71717a",
    accent: "#2563eb", // Blue
    accentText: "#ffffff",
    headingFont: "Inter, ui-sans-serif, system-ui, sans-serif",
    bodyFont: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: "1rem",
  },
  horizon: {
    label: "Horizon (Hotel)",
    bg: "#050505",
    surface: "#111111",
    text: "#f0f0f0",
    textMuted: "#8e8e8e",
    accent: "#c9a227", // Deeper Gold
    accentText: "#000000",
    headingFont: "Playfair Display, Georgia, serif",
    bodyFont: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: "0px",
  },
  scholastic: {
    label: "Scholastic (School)",
    bg: "#ffffff",
    surface: "#f0f4f8",
    text: "#0f172a",
    textMuted: "#475569",
    accent: "#1d4ed8", // Classic Blue
    accentText: "#ffffff",
    headingFont: "Merriweather, serif",
    bodyFont: "ui-sans-serif, system-ui, sans-serif",
    radius: "0.5rem",
  },
  playful: {
    label: "Playful (Elementary)",
    bg: "#fffdf0",
    surface: "#fff7e6",
    text: "#27272a",
    textMuted: "#52525b",
    accent: "#10b981", // Emerald Green
    accentText: "#ffffff",
    headingFont: "'Comic Sans MS', 'Chalkboard SE', sans-serif",
    bodyFont: "'Nunito', ui-sans-serif, system-ui, sans-serif",
    radius: "1.5rem",
  },
  prestige: {
    label: "Prestige (Private School)",
    bg: "#fcfcfc",
    surface: "#f3f4f6",
    text: "#111827",
    textMuted: "#4b5563",
    accent: "#064e3b", // Deep Forest Green
    accentText: "#d4af37", // Gold text on green
    headingFont: "Cinzel, 'Times New Roman', serif",
    bodyFont: "'Lora', serif",
    radius: "0px",
  },
};

export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = "minimal";

export const SECTION_TYPES = [
  { id: "hero", label: "Hero" },
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "gallery", label: "Gallery" },
  { id: "hours", label: "Hours" },
  { id: "testimonials", label: "Testimonials" },
  { id: "contact", label: "Contact" },
  { id: "cta", label: "Call to Action" },
  { id: "footer", label: "Footer" },
  { id: "school-admissions-timeline", label: "School: Admissions Timeline" },
  { id: "school-curriculum", label: "School: Curriculum" },
  { id: "school-head-welcome", label: "School: Head Welcome" },
  { id: "hotel-rooms", label: "Hotel: Rooms & Suites" },
  { id: "hotel-amenities", label: "Hotel: Amenities Matrix" },
  { id: "hotel-booking", label: "Hotel: Booking Engine" },
  { id: "hotel-feature", label: "Hotel: Feature Showcase" },
  { id: "retail-products", label: "Retail: Product Catalog" },
] as const;

export type SectionType = (typeof SECTION_TYPES)[number]["id"];
