# UI_UX.md - Styling System & Design Guidelines

This document defines the visual guidelines, typography, color system, and layout responsiveness principles.

---

## 1. Premium Visual Identity & Colors

SuperBot uses a **Modern Slate Dark Theme** accented with glowing cyan, emerald, and amber alerts.

### Tailwind Color Token Palette
Configure your `tailwind.config.js` to support these values:
- **Background (Canvas)**: `slate-950` (`#030712`)
- **Card Background**: `slate-900` (`#0f172a`) with a border of `slate-800` (`#1e293b`)
- **Text Primary**: `slate-50` (`#f8fafc`)
- **Text Muted**: `slate-400` (`#94a3b8`)
- **Accent Primary**: `cyan-500` (`#06b6d4`)
- **Success (Paid)**: `emerald-500` (`#10b981`)
- **Warning (Verification)**: `amber-500` (`#f59e0b`)
- **Destructive (Cancelled)**: `rose-500` (`#f43f5e`)

### Glassmorphism Card Style
Use this combination for overlay elements (modals, dropdown dropdowns, sticky headers):
```css
.glass-panel {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

---

## 2. Shadcn UI Component Catalog Usage

We use Shadcn UI components. Ensure all UI controls follow these conventions:

- **Buttons**:
  - Primary actions: `<Button className="bg-cyan-600 hover:bg-cyan-500 text-white">`
  - Destructive: `<Button variant="destructive">`
  - Secondary/Outline: `<Button variant="outline" className="border-slate-800">`
- **Drawers (Sheets)**:
  - Used for detailed side-panel views (e.g. order review). Set `side="right"` and make it responsive using `<SheetContent className="w-full sm:max-w-xl">`.
- **Modals (Dialogs)**:
  - Used for isolated, modal tasks (e.g., adding a new product). Ensure click-outside-to-close behavior is enabled.
- **Toasts**:
  - Triggered after async actions. Use `toast({ title: "Order Updated", description: "Customer notified via bot." })`.

---

## 3. Responsive Web Principles

### Sidebar Navigation Collapse
On screens smaller than the Tailwind `md` breakpoint (`768px`), the navigation undergoes the following transformation:
1. The persistent left-hand Sidebar is hidden (`hidden md:flex`).
2. A header bar with a **Hamburger menu icon** is shown.
3. Clicking the hamburger menu triggers a Shadcn Sheet overlay containing the navigation options.

### Tables and Grid Layouts
- **Tables**: On small mobile viewports, default tables are wrapped in an overflow container (`overflow-x-auto`) to enable horizontal scrolling, or transformed into lists of stacked cards.
- **Grid Layouts**: Metrics display grids are configured with mobile-first columns: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
