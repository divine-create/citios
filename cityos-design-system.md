# CityOS Design System & Primitives

## Principles
1. **Unambiguous**: Interfaces must clearly communicate state and expected actions.
2. **Local Focus**: The design should highlight the geography (city scope) without overshadowing the merchants.
3. **Accessible & Responsive**: Designed for mobile-first usage in variable connectivity environments.
4. **Premium but Practical**: Avoiding generic SaaS looks in favor of a polished consumer platform.

## Color Palette (Tailwind)
- **Primary Brand**: Teal (	eal-500 to 	eal-800). Used for primary actions, success states, and brand trust.
- **Secondary Action**: Orange (orange-500). Used for notifications, prominent badges, and "warm" accents.
- **Text/Ink**: 	ext-slate-900 (Headers) / 	ext-slate-500 (Body text). Custom 	ext-ink class is often mapped to heavy dark slates.
- **Backgrounds**: g-slate-50 (App background), g-white (Cards).
- **Error**: ed-600
- **Warning**: mber-500

## Typography
- **Headings**: Heavy, tight tracking (ont-black tracking-tight).
- **Data Labels**: Small, uppercase, wide tracking (	ext-[10px] font-bold uppercase tracking-wider text-slate-500).
- **Body**: Clean readable slate text (	ext-sm text-slate-600).

## UI Primitives Roadmap

### 1. Buttons (Button.tsx)
Standardized variants:
- **Primary**: Solid background (Teal or Ink), white text, rounded-xl.
- **Secondary**: Light background (Slate 100), dark text.
- **Outline**: Bordered, transparent background.
- **Ghost**: Transparent background, text colored on hover.
*Features*: Needs isLoading, leftIcon, ightIcon props.

### 2. Feedback (EmptyState.tsx, ErrorBanner.tsx)
- **EmptyState**: Centered layout, subdued icon, bold title, descriptive subtitle, optional action button.
- **ErrorBanner**: Inline rendering (no raw alerts!), colored background (red-50), descriptive icon, readable text.

### 3. Forms (Input.tsx, Select.tsx)
- Standardized h-12 for touch accessibility.
- Integrated validation states and labels.
- ounded-xl borders.

### 4. Layouts (Card.tsx, Modal.tsx, Drawer.tsx)
- Use mobile-first Drawers (ottom-sheet style) for small screens instead of center Modals.
- Cards default to ounded-2xl border border-slate-100 bg-white.

