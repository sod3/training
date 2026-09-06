# SPOTTER final implementation notes

This source package reflects the online-only SPOTTER marketplace requirements.

## Implemented
- Online-only discovery: public area/location, near-me and gym/home/outdoor training flows removed; legacy `/locations` redirects to `/trainers`.
- Trainer account creation now continues into a six-step onboarding workflow: profile, CNIC identity, certification, services/pricing, availability, review/submit.
- Trainer application remains DRAFT until final submission. Admin approval requires approved identity and certification evidence, active services and availability.
- Admin verification surfaces legal name, public name, email, phone, CNIC, application status and protected evidence links.
- Trainer categories/specialties/languages use controlled menus. Public category/specialty filters are derived only from approved, active, bookable trainer supply and dependent facets avoid impossible category/specialty combinations.
- Matching uses four questions and real approved trainer data, with Best Matches and Also Recommended sections.
- Booking frontend/backend payloads are aligned. Availability is database-backed and reservation writes use transactional trainer locking to protect against overlapping bookings.
- Manual JazzCash/EasyPaisa payment flow retained. Payment proof is stored in MongoDB and must be reviewed by Admin before confirmation.
- Password recovery is support/admin-assisted with expiring one-time reset links because outbound email is intentionally disabled. Signed-in users can change their sign-in email and password with their current password.
- Notifications remain in-app only.
- Uploaded images, CNIC/certification documents and payment proof are stored in MongoDB. Private media remains authenticated/authorized.
- Completed-booking-only reviews retained and customer review UI improved.
- Customer/trainer timezone handling improved; customer-facing availability is rendered in the device timezone.
- SEO updated for online personal training, including page metadata, trainer metadata/structured data, robots and sitemap.
- Vercel Hobby cron remains daily (`0 1 * * *`). Request-time expiry checks remain authoritative.

## Required production environment
Set the values documented in `.env.example`, especially `MONGODB_URI`, `AUTH_SECRET`, `APP_URL`, admin credentials, JazzCash/EasyPaisa account details, and `CRON_SECRET`.

MongoDB must support transactions (MongoDB Atlas or another replica set). Run `npm run db:indexes` against the production database before launch because automatic index creation is disabled in production.

## Validation completed in this delivery environment
- `git diff --check`: passed.
- JSON configuration parsing: passed.
- package.json/package-lock root dependency synchronization: passed.
- TypeScript/TSX parser validation across source/scripts/tests: passed (110 files, zero syntax errors).
- Local import resolution scan: passed (zero missing local imports).
- Legacy public location/training-mode scan: passed.
- Obsolete Safepay/AWS/SMTP/Nodemailer source/config scan: passed.

A dependency-resolved `next build`/Playwright run could not be completed in this execution environment because `npm ci` could not finish downloading packages before the execution timeout. Run `npm ci && npm run typecheck && npm test && npm run build` in CI or locally before promoting the deployment.
