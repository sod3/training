# Spotter

Spotter is a production marketplace for discovering and booking personal trainers. The Next.js 16 App Router application uses MongoDB/Mongoose, server-side sessions, Zod validation, manual JazzCash/EasyPaisa payment review, private document storage, and responsive customer, trainer, and administrator workspaces.

## Setup

```sh
npm install
Copy-Item .env.example .env
npm run dev
```

Fill the values in `.env` before using the database, file uploads, or payments. The local `.env` contains a generated development `AUTH_SECRET`; replace it with a new secret for each deployed environment.

MongoDB must be a replica set (MongoDB Atlas supplies this) because checkout and booking updates use transactions. Set `MONGODB_URI` and run:

```sh
npm run db:indexes
npm run admin:bootstrap
```

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are read only by the bootstrap command. The password is hashed with bcrypt and never returned to the browser. Remove `ADMIN_PASSWORD` from deployment after bootstrap. To seed only taxonomy records in development, set `ALLOW_DEVELOPMENT_SEED=true` and run `npm run db:seed`; seeding is refused in production.

## Environment

`MONGODB_URI`, `AUTH_SECRET`, and `APP_URL` are required. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are used to provision the administrator. Configure the manual payment receiver details with `PAYMENT_ACCOUNT_NAME`, `JAZZCASH_ACCOUNT_NUMBER`, and `EASYPAISA_ACCOUNT_NUMBER`. Configure the private S3-compatible bucket with `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and optional `S3_ENDPOINT` for images, payment screenshots, and verification documents. `CRON_SECRET` protects the scheduled hold-expiry, reminder, and upload-cleanup worker at `/api/jobs`.

## Application architecture

- `src/models` contains users, customer/trainer profiles, applications, credentials, packages, availability, orders, sessions, payments, refunds, payouts, transactions, reviews, favorites, conversations, messages, notifications, taxonomy, support, audit, session, token, upload, and email-job collections.
- `src/lib/server/security.ts` provides HTTP-only cookie sessions, bcrypt checks, session-version revocation, role guards, origin checks, and rate limits.
- `src/services` contains centralized booking, availability, payment, trainer-application, community, dashboard, storage, and authentication rules.
- `src/app/api/[...path]/route.ts` is the validated server API boundary. It enforces ownership and role checks before calling services.
- Public trainer search and profiles query only active, email-verified, approved, public trainers. Development records are never automatically created.

Checkout creates a short-lived held reservation, verifies the selected package and current availability in a MongoDB transaction, and asks the customer for a JazzCash/EasyPaisa transaction ID and screenshot. Only an administrator approval changes the payment and booking to confirmed. Package snapshots preserve historical price, commission, duration, and cancellation terms. Individual session records support multi-session packages and prevent overlapping reservations.

## Tests and deployment

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The backend suite uses a temporary MongoDB replica set and tests authentication validation, role and ownership guards, availability/timezones, partial-overlap races, idempotency, snapshots, payment webhook signatures, review eligibility, favorites, and private conversations. The browser suite starts the production build on port 3200 and checks public pages, responsive layout, secure registration/login, protected workspaces, support requests, and trainer application state.

Deploy the build to Vercel, set every production variable from `.env.example`, use an HTTPS `APP_URL`, run the index/bootstrap commands once against the production database, and configure the JazzCash/EasyPaisa receiver details. Configure the Vercel cron in `vercel.json` or invoke `/api/jobs` once per minute with `Authorization: Bearer $CRON_SECRET`. An S3-compatible provider is required for payment screenshots and other uploads.
