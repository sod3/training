# Elevate

A responsive personal training marketplace for Karachi, built on the existing Next.js 16 App Router project. It uses Geist, Tailwind 4, Base UI, Framer Motion, Lucide, and Recharts.

## Run locally

```sh
npm install
npm run dev
```

For a production preview:

```sh
npm run build
npm run start -- --port 3100
```

## Verify

```sh
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests start a production server on port 3100 (or reuse one already running). They cover public and dashboard routes, nine viewport widths from 320 to 1920 pixels, filter state, mobile sheets, favorites, comparison, matching, booking, simulated payment failure, calendar export, cancellation, applications, and messages.

## Architecture

- `src/app`: route wrappers, static information pages, homepage, and error/loading boundaries. Trainer profiles use `generateStaticParams`; unknown trainers return HTTP 404.
- `src/components/marketplace`: discovery, trainer cards and profiles, filter/map experience, six-step matching, authentication, booking, and confirmation.
- `src/components/dashboard`: shared responsive workspace for customer, trainer, and admin roles, including bookings, progress, messaging, applications, and booking-value charts.
- `src/components/marketplace/store.tsx`: typed local demo state, persistence, toast feedback, and comparison tray.
- `src/data/trainers.ts` and `src/types/trainer.ts`: the original trainer contract and six sample coaches. Every coach has a single-session entry point.
- `src/lib/marketplace.ts`: shared goal matching, price formatting, date keys, and demo slot generation.
- `src/lib/motion.ts` and `src/components/motion`: reusable motion settings and viewport reveals.
- `src/app/globals.css`: semantic color tokens, typography, layouts, breakpoints, focus states, and reduced-motion rules.

## Product flows

Search supports goal, specialty/name, location, gender, training type, budget, rating, experience, identity verification, and availability. Filters update immediately and share through the URL. List/map mode uses an explicitly illustrative map; distance sorting uses sample distances.

Matching scores are deterministic: the percentage is the share of selected goal, area, training type, price, and time criteria that match. Gender is a strict preference filter. Reasons accompany each result.

Bookings carry the selected trainer, package, date, time, location, and amount through checkout. Occupied slots are unavailable while a booking remains active. All times are PKT. Confirmation exports an `.ics` file, and cancellation follows the displayed 12-hour sample policy.

Trainer accounts can log completed sessions. Customer dashboards show package usage and accept a review after the package is completed. Applications can be approved or declined from the admin workspace.

## Demo boundaries

This remains backend-independent. Profiles, reviews, statistics, credentials, availability, photos, and editorial stories are sample content. Identity and credential badges are distinct; credentials are not claimed as verified when the sample record says otherwise.

Login selects a demo role; it is not authentication or access control. No payment is taken. No email, SMS, support request, or message is sent externally. Bookings, favorites, comparisons, progress, workspace profile, reviews, and messages persist in this browser under `elevate-state`. Clear the site's browser storage to reset the demo.

Photos are served through Next/Image from Unsplash, with responsive sizes and lazy loading. The main hero is prioritized. No fabricated before/after transformation photos or guaranteed outcome claims are used.

The existing Vercel deployment is not changed by local development. Deploy through the project's existing hosting workflow when ready.
