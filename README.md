# Frankly — Personal Finance PWA

Offline-first Progressive Web App for personal finance tracking. Base currency is **CHF**. Built with React, TypeScript, Tailwind CSS, Dexie (IndexedDB), and `vite-plugin-pwa`.

## Features

- Quick daily expense logging with multi-currency support
- Safe-to-spend daily budget widget (CHF)
- Recurring costs (virtual — do not affect daily allowance)
- Big / one-off expenses (excluded from daily budget)
- Income & net cash-flow summary
- Analytics: category pie chart, multi-month trend, averages
- Categories management with defaults + custom
- JSON backup export / import
- Installable PWA with full offline support
- Live exchange rates (Frankfurter) with IndexedDB cache

## Currency order

CHF (default) → EUR → AUD, CAD, GBP, JPY, USD

## Scripts

```bash
npm install
npm run dev      # development server
npm run build    # production build
npm run preview  # preview production build
```

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Dexie / IndexedDB
- Recharts
- Lucide React
- vite-plugin-pwa
