# Online availability — production behavior

Spotter is an **online-only** personal-training marketplace. Availability is a recurring weekly schedule in each trainer's IANA timezone. There are no location, area, gym/home/outdoor or training-mode fields in availability.

## Weekly schedule write flow

`POST /api/trainer/availability` (and `PATCH`) accepts the complete desired schedule:

```json
{
  "rules": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "12:00" },
    { "dayOfWeek": 3, "startTime": "16:00", "endTime": "20:00" }
  ]
}
```

The backend validates weekday and `HH:mm` values, rejects duplicate/overlapping windows, and replaces the trainer's rules transactionally. Removing one window means omitting it from the replacement array; removing all windows sends `{ "rules": [] }`. Existing confirmed sessions are never deleted when recurring availability changes.

The original production 503 was caused by a Mongoose multi-document create inside a transaction without the required ordered behavior. The current implementation performs the replacement safely in a transaction and keeps booking/reservation state independent of recurring rules.

## Public slots

Public slots are generated server-side from:

- the trainer's weekly rules and timezone;
- dated availability exceptions/time off;
- confirmed/completed/no-show sessions;
- active unexpired checkout holds;
- platform booking-notice and horizon rules.

`GET /api/trainers/:trainerId/availability` requires an active package so slot duration comes from real package data. The customer sees generated dates/times; checkout sends only the package ID, selected UTC start instant and idempotency key.

All booking timestamps are stored as UTC instants. Trainer weekly rules remain local wall-clock values in the trainer's IANA timezone. Customer-facing interfaces render session instants in the customer's browser/local timezone where appropriate.

## Concurrency

Availability display is advisory; the database booking transaction is authoritative. Booking locks the trainer and re-checks overlap immediately before creating the held session. This prevents two simultaneous customers from successfully reserving overlapping exclusive sessions.

## Cron

The Vercel Hobby deployment uses the daily cron in `vercel.json`. Correctness does **not** depend on minute-by-minute cleanup: request-time slot generation ignores expired holds by timestamp, and booking re-checks conflicts transactionally. The cron performs eventual cleanup/reminders once it runs.

## Release verification

Before production deployment run, where the environment permits:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Then verify on staging/production with dedicated test accounts: save/edit/delete weekly windows, open the public profile, attempt overlapping bookings from two customers, submit a manual JazzCash/EasyPaisa proof, approve it as Admin, and verify exactly one confirmed session remains.
