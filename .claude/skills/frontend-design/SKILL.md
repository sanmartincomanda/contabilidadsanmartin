---
name: frontend-design
description: Design system and UI guidelines for the Carnes Amparito financial app — brand colors, Tailwind patterns, component conventions, and corporate style rules. Use when creating or editing React components, styling UI, choosing colors, or applying layout patterns.
---

# Carnes Amparito — Frontend Design System

## Brand Identity

Corporate financial tool for a meat business. Style must be **formal, structured, and professional** — never playful or casual.

### CSS Variables (defined in `src/index.css`)
```
--brand-wine:       #a81d24   ← primary color, actions, active states
--brand-wine-dark:  #7f1218   ← hover state for wine
--brand-gold:       #f2b635   ← accent, highlights, secondary emphasis
--brand-cream:      #fbf2e8   ← light background tint
--brand-cream-deep: #f3e2d1   ← deeper background tint
--brand-ink:        #211617   ← body text color
```

### Body Background
The `body` has a dark wine mesh gradient (see `.dash-mesh` in App.jsx). Page wrappers should be **transparent or stone-toned** to let it show through — never override with a blue or generic grey background.

---

## Color Usage Rules

| Element | Tailwind Class |
|---|---|
| Primary button | `bg-[#a81d24] hover:bg-[#7f1218] text-white` |
| Active tab | `bg-[#a81d24] text-white` |
| Inactive tab | `text-[#a81d24] hover:bg-[#fff0f0]` |
| Input focus ring | `focus:border-[#a81d24] focus:ring-[#a81d24]/20` |
| Card icon background | `bg-[#fff0f0] text-[#a81d24]` |
| Gold accent / badge | `bg-[#f2b635] text-[#211617]` or `text-[#f2b635]` |
| Section header strip | `h-1 bg-gradient-to-r from-[#a81d24] via-[#f2b635] to-[#a81d24]` |
| Danger / delete | `bg-red-600 hover:bg-red-700` |
| Secondary action | `bg-white border border-[#efd8c8] text-[#a81d24] hover:bg-[#fff0f0]` |
| Dropdown/panel border | `border border-[#efd8c8]` |

**Never use generic blue** (`blue-*`, `indigo-*`) for brand elements. Blue is only acceptable for purely informational neutral states.

---

## Typography

- Labels and column headers: `text-xs uppercase tracking-wider text-slate-500 font-semibold`
- Section titles: `text-sm font-bold text-[#211617] uppercase tracking-wide`
- Body / table cells: `text-sm text-slate-700`
- Monetary values: `font-mono text-sm` (use `fmt` from `src/constants.ts` for formatting)
- Keep text **tight and dense** — avoid large font sizes except for KPI numbers
- KPI numbers: `text-2xl font-bold text-[#211617]`

---

## Spacing & Shape

- Card rounding: `rounded-xl` (not `rounded-3xl` — avoid playful look)
- Card shadow: `shadow-sm` or `shadow-md shadow-[#7f1218]/08`
- Card background: `bg-white/90` with `backdrop-blur-sm` when floating over the mesh background
- Section padding: `p-4` or `p-6`
- Table row height: compact — `py-2 px-3`
- Gaps between cards: `gap-4` or `gap-6`

---

## Component Patterns

### Buttons
```jsx
// Primary
<button className="px-4 py-2 bg-[#a81d24] hover:bg-[#7f1218] text-white text-sm font-semibold rounded-xl transition-colors">
  Guardar
</button>

// Secondary / outline
<button className="px-4 py-2 bg-white border border-[#efd8c8] text-[#a81d24] hover:bg-[#fff0f0] text-sm font-semibold rounded-xl transition-colors">
  Cancelar
</button>

// Icon button
<button className="p-2 text-[#a81d24] hover:bg-[#fff0f0] rounded-lg transition-colors">
  <Icon ... />
</button>
```

### Cards / Panels
```jsx
<div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-[#efd8c8] p-4">
  {/* Brand strip at top of major panels */}
  <div className="h-1 bg-gradient-to-r from-[#a81d24] via-[#f2b635] to-[#a81d24] rounded-t-xl -mx-4 -mt-4 mb-4" />
  ...
</div>
```

### Tabs
```jsx
<div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActive(tab.id)}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
        active === tab.id
          ? 'bg-[#a81d24] text-white shadow-sm'
          : 'text-[#a81d24] hover:bg-[#fff0f0]'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### Form Inputs
```jsx
<input
  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl
             focus:outline-none focus:border-[#a81d24] focus:ring-2 focus:ring-[#a81d24]/20
             bg-white text-[#211617] placeholder-stone-400"
/>

<select
  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl
             focus:outline-none focus:border-[#a81d24] focus:ring-2 focus:ring-[#a81d24]/20
             bg-white text-[#211617]"
/>
```

### KPI Cards
```jsx
<div className="dash-kpi bg-white/90 backdrop-blur-sm rounded-xl border border-[#efd8c8] p-4 flex items-start gap-3">
  <div className="p-2 bg-[#fff0f0] rounded-lg">
    <Icon className="w-5 h-5 text-[#a81d24]" />
  </div>
  <div>
    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Ingresos</p>
    <p className="text-2xl font-bold text-[#211617]">{fmt(value)}</p>
  </div>
</div>
```

### Tables
```jsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-stone-200">
      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-slate-500 font-semibold">
        Columna
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
      <td className="py-2 px-3 text-slate-700">...</td>
    </tr>
  </tbody>
</table>
```

### Badges / Status Pills
```jsx
// Success
<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
  Pagado
</span>

// Warning
<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
  Pendiente
</span>

// Gold accent
<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#f2b635]/20 text-[#a81d24]">
  Urgente
</span>
```

---

## Icons

Icons are inline SVG paths — no icon library. Use the `Icon` component pattern established in the project:

```jsx
const Icon = ({ d, className = 'w-5 h-5', strokeWidth = 2 }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
```

Standard sizes: `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large).

---

## Animations

CSS animation classes are defined in `App.jsx` (`DASHBOARD_STYLES`). Use these for entrance animations:

| Class | Effect |
|---|---|
| `dash-up dash-up-1` through `dash-up-6` | Slide up + fade in, staggered (60ms increments) |
| `dash-fade` | Fade in |
| `dash-glass` | Frosted glass: `bg-white/82 backdrop-blur-[16px]` |
| `dash-kpi` | KPI hover lift + shadow |
| `dash-panel` | Slide in from right |
| `dash-pulse` | Slow opacity pulse (for loading/alerts) |
| `dash-mesh` | Animated dark wine gradient background |
| `dash-dots` | Subtle gold dot grid background pattern |

Apply stagger by adding `dash-up-1`, `dash-up-2`, etc. to sibling cards.

---

## Layout Rules

- Use `min-h-screen` on page wrappers; keep background **transparent** so the body gradient shows
- Max content width: `max-w-7xl mx-auto px-4` for full pages
- Header is fixed/sticky — content needs `pt-16` or similar top padding
- Print: add `no-print` class to elements that should not appear in `@media print`
- Mobile: hamburger menu handled in `Header.jsx`; design mobile-first with `md:` breakpoints

---

## Do NOT

- Add `bg-blue-*`, `bg-indigo-*`, or any generic blue to brand UI elements
- Use `rounded-3xl` — keep `rounded-xl` max for corporate look
- Add large decorative emoji or playful icons in the main UI
- Use `text-lg` or larger for labels/table content — keep UI dense
- Use generic `gray-*` for borders — prefer `stone-*` or `[#efd8c8]`
- Override the body background with a solid color on page wrappers
