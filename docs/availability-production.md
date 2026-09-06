# Availability production repair

## Reproduced root cause

The installed Mongoose 9.9.5 throws this error in `Model.create()` when a session
and more than one document are supplied without `ordered: true`:

```
MongooseError: Cannot call `create()` with a session and multiple documents unless `ordered: true` is set
```

`trainerAction()` supplied an array of weekly windows with only `{ session }`.
A two-window integration test reproduced the exception against a MongoDB replica
set before the fix. Single-window saves do not trigger this particular failure.
The replacement now uses `{ session, ordered: true }`. Changing the subsequent
trainer profile update cannot fix an exception thrown before that update runs.

## Request and database flow

1. The Node.js catch-all route awaits `connectDB()`. `MONGODB_URI` is server-only,
   checked at request time, and never returned in a response. Concurrent cold
   requests share a pending connection; warm requests reuse the default Mongoose
   connection and pool. Failed attempts and disconnects do not leave a resolved,
   stale connection promise cached. Queries do not silently buffer before connection.
2. The write route checks origin, parses bounded JSON, validates the session cookie
   against `AuthSession`, and loads an active `User` with matching session version.
   `requireUser(["TRAINER"])` enforces authorization before the write rate limit.
3. `ownTrainer()` validates the actor ObjectId and loads `TrainerProfile` by
   **userId**, not by treating the user's ID as a trainer profile ID. Models reuse
   `mongoose.models` and are registered on the same default connection.
4. Zod accepts only the weekly rule fields. Each has an integer weekday 0–6,
   HH:mm local times, and unique supported training types. The server rejects
   equal start/end, duplicate windows and overlapping windows, including overnight
   and Saturday-to-Sunday overlaps. Adjacent windows are allowed. Overlapping
   training modes should be combined in one window's `trainingTypes` array.
5. A transaction increments the trainer revision first, serializing availability
   changes with booking operations. It checks the stored IANA timezone, deletes
   the trainer's old rules, inserts the new rules sequentially, and updates only
   review metadata. Mongoose independently validates stored fields. Failure rolls
   back deletion, insertion and metadata together. Existing sessions are untouched.
   The driver's transaction/retry budget is 25 seconds, below the route's 60-second limit.
6. `GET /api/trainer/availability` reloads that trainer's rules in a stable order.
   Responses use `Cache-Control: no-store`; the UI reloads after saving.

The existing UI uses **schedule replacement**, not individual slot CRUD URLs:

- Add/edit: `POST /api/trainer/availability` with `{ "rules": [...] }` containing
  the complete desired schedule. `PATCH` accepts the same replacement payload.
- Delete a window: omit it from the replacement array. Delete all: `{ "rules": [] }`.
- Reload: `GET /api/trainer/availability` or refresh the trainer availability page.

Weekly rules are recurring wall-clock times in the trainer's timezone, not dated
UTC instants. An end time earlier than the start means the next day. Dated
exceptions and reservations remain MongoDB dates/UTC instants; existing slot
generation tests cover midnight and daylight-saving transitions.

An additional cold-start defect was removed: importing all models previously
called `Payment.collection.createIndex()` before connecting, without awaiting it.
The unique sparse transaction ID index is now declared in the schema and created
by the explicit index migration instead of an unhandled import-time write.

## Errors and logs

Input/Zod/Mongoose validation and cast errors return 400; authentication and role
errors retain 401/403; missing trainer records return 404; duplicates, overlaps and
version conflicts return 409. Unexpected database/application errors return 500.
Unsupported weekly-write methods return 405. Rate limiting remains 429.

Every handled failure emits `Spotter request failed` with structured JSON: request
ID, method, route, failing operation, status, original error name, message, stack,
numeric MongoDB code, error labels, causes and nested validation errors when present.
MongoDB URIs and configured secrets are redacted. Request bodies, cookies,
authorization headers and query documents are not logged. A safe message and
correlating request ID are returned to the frontend; raw database errors stay server-side.
Transient transaction errors are rethrown unchanged so the driver can retry;
only the final rejected request is logged.

## Deployment and verification

Check the actual Vercel project's **Production** environment, not only local `.env`:

- `MONGODB_URI`: Atlas/another transaction-capable replica set or sharded cluster,
  correctly escaped credentials, correct existing database, and network access
  from Vercel. Do not rename the database as part of this repair. A URI with no
  database path uses MongoDB's default database unless otherwise configured.
- `AUTH_SECRET`: at least 32 characters, matching the existing deployment.
- `APP_URL`: the canonical HTTPS production origin (the route also supports the
  existing Vercel production/deployment URL fallback).
- Database user permissions must permit reads, inserts, deletes and updates on
  Spotter's existing database. Run `npm run db:indexes` using the intended database
  and migration permissions; do not run migrations on every request.

`npm run db:check` is read-only: it reports configuration booleans, connectivity,
transaction topology, model connection identity and collection presence. Inject
the target environment to check it; without that, it checks local `.env` only.
It does not prove production write permissions. The local check during this repair
passed connectivity/topology/model checks; the local URI has no explicit database path.
No URI or credential value is printed.

Validate a release with:

```
npm test
npm run lint
npm run build
npm run test:e2e
```

The browser suite starts the optimized production build against an isolated MongoDB
replica set. Its availability test signs in as a trainer, adds two windows, edits
one, deletes one and then all, and hard-reloads after every save. It also checks
401/403/400/409 HTTP responses and persistence following rejected writes. Backend
tests exercise partial-write rollback, concurrent replacements, reservation
preservation, model validation, reconnection and log redaction.

After deploying this source to the correct Vercel project, repeat those UI actions
using a dedicated trainer test account and check both Network responses and Vercel
function logs. Confirm another trainer's schedule and existing reservations remain
unchanged. Use test windows and remove them afterward. Local production-build tests
are not a substitute for this final deployment check.

At the time of this repair, the workspace had no linked Vercel project, the Vercel
CLI had no saved credentials, and no signed-in browser session was available.
Deployment, Vercel environment inspection and live CRUD verification therefore
require access to the production project and an authenticated trainer test session.
