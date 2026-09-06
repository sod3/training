# SPOTTER

Spotter is an **online-only personal-training marketplace** built with Next.js, MongoDB/Mongoose and TypeScript. Customers discover approved trainers, use a short matching flow, book real availability, submit manual JazzCash/EasyPaisa payment proof, message trainers, attend sessions through trainer-provided private meeting links, and review completed bookings.

## Product rules

- No public areas, cities, distance, “near me”, home/gym/outdoor or in-person training flows.
- Trainer discovery is based on approved real trainer data, categories, specialties, availability and price.
- Filter options are generated only from currently approved, active, bookable trainers.
- Trainers select filterable category/specialty/language values from controlled menus rather than inventing new filter values.
- Trainer applications stay `DRAFT` until profile, photo, CNIC/identity, certification, active service/package and weekly availability are complete and the trainer explicitly submits.
- Identity, certification and profile approval are separate trust decisions.
- Customer reviews require an eligible completed booking.
- Notifications are in-app only for this deployment; no email-verification flow is required.
- Upload bytes are stored in MongoDB by design and protected by authorization.

## Trainer onboarding

Trainer signup creates a secure account and immediately redirects to `/trainer/onboarding`:

1. Professional profile + profile photo
2. Identity details + CNIC document
3. Professional certification
4. Services & pricing
5. Weekly online availability
6. Review & submit

Normal profile/service/availability details can be edited later from the trainer dashboard. Sensitive identity or credential changes return the relevant verification status to review when required. Existing paid bookings preserve historical price/duration snapshots.

## Authentication and recovery

Sessions are database-backed secure cookies with server-side RBAC. Email verification is intentionally not used. Signed-in users can change their email or password from Security after confirming the current password; this revokes existing sessions.

The public “forgot password” form creates a non-enumerating account-recovery support request. After verifying the account owner, an administrator can issue a one-time 30-minute reset URL from the Users/Customers admin screen. The reset token is stored only as a hash and is single-use.

## Manual payments

Checkout uses the configured manual receivers only:

- `JAZZCASH_ACCOUNT_NUMBER`
- `EASYPAISA_ACCOUNT_NUMBER`
- `PAYMENT_ACCOUNT_NAME`

The customer creates a temporary booking hold, transfers funds, enters payer/transaction details and uploads proof. Submitting proof extends the reservation review window up to 24 hours (never beyond the session start). An administrator approves or rejects the proof. Approval creates one SALE transaction and confirms the held session transactionally. Browser redirects are never treated as payment confirmation.

Refunds are also operationally manual and have an audited admin status/reference workflow.

## Required environment

Copy `.env.example` and set production values:

- `MONGODB_URI` — a transaction-capable MongoDB replica set/Atlas deployment
- `AUTH_SECRET` — at least 32 cryptographically random characters
- `APP_URL` — canonical HTTPS website origin
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — one-time admin bootstrap configuration
- `PAYMENT_ACCOUNT_NAME`
- at least one of `JAZZCASH_ACCOUNT_NUMBER`, `EASYPAISA_ACCOUNT_NUMBER`
- `CRON_SECRET`

Uploads intentionally require no S3 configuration.

## Database preparation

```bash
npm run db:indexes
npm run admin:bootstrap
npm run db:check
```

Run index/bootstrap commands deliberately against the intended database; do not run them on every request. Development seed data is disabled unless `ALLOW_DEVELOPMENT_SEED=true`.

## Quality checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

The backend suite covers validation, role/ownership guards, recurring availability, timezones, overlapping booking races, booking idempotency and snapshots, manual-payment approval, review eligibility and private messaging. Browser tests cover production routes and account/trainer workflows.

## Vercel cron

`vercel.json` intentionally uses the Vercel Hobby-compatible daily schedule. Request-time expiry checks remain authoritative, so customers cannot book an expired held slot just because cleanup has not run yet. The scheduled job performs eventual hold cleanup, session reminders and abandoned-upload cleanup.

## Deployment checklist

Use a staging database first. Confirm: trainer onboarding/submission, Admin CNIC/credential review, real dynamic trainer filters, matching, simultaneous booking protection, manual JazzCash/EasyPaisa approval, cancellation/refund states, meeting-link authorization, completed-booking reviews, password recovery, mobile layouts, SEO metadata/sitemap/robots and error/empty/loading states.
