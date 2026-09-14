# Mobile experience audit

The phone interface uses a shared design layer in `src/app/mobile.css`, loaded with the application layout. It retains Spotter’s charcoal, warm neutral, and lime identity while standardizing mobile spacing, type, cards, controls, and safe-area treatment. Desktop layouts remain available.

## Coverage

- Home: portrait crop, hero proportions, trainer carousel, coaching content, matching preview, trust content, and footer.
- Navigation: mobile menu, account actions, active routes, persistent customer/trainer/admin workspace navigation.
- Discovery: search, sorting, filter sheets, active filters, trainer cards, saved trainers, comparison, and matching results.
- Trainer profiles: biography, credentials, reviews, packages, date/time selection, related trainers, and the bottom booking action.
- Matching: all four questions, back/continue controls, restored answers, processing, and results.
- Booking: packages, calendar/date controls, time slots, order summary, all three payment methods, transfer details, copy controls, proof upload, and booking statuses.
- Authentication: customer/trainer signup, login, admin login, password reset, and account verification routes.
- Customer workspace: overview, training summary, booking/session controls, messaging, reviews, saved trainers, profile, and notifications.
- Trainer workspace: overview, client list/detail, messaging, scheduling, packages, availability/timezones, earnings/history, payout requests, profile, verification, application status, reviews, and security.
- Trainer onboarding: all six sections, section navigation, uploads, weekly availability, and review/submission.
- Admin: overview, users, customers, trainers, applications, verification, bookings, payments, refunds, payouts, operations, categories, specialties, content, sessions, reviews, support, audit logs, settings, notifications, security, and reports.
- Supporting pages: about, how it works, recruitment, contact, help, safety, privacy, terms, cancellation, careers, locations, and not found.
- Shared states: cards, forms, long identifiers, stacked financial tables, confirmation/payout/scheduling dialogs, notifications, loading, errors, empty accounts, and success feedback.

## Interaction repairs

- Repaired conflicting legacy drawer rules: identity, account links, and logout remain visible; section headings sit above full-width links; the drawer and backdrop appear above the site header.
- Added drawer focus containment, Escape dismissal, focus restoration, background inertness, link dismissal, and automatic closure when resizing to desktop. Closed drawers are hidden from keyboard navigation.
- Reduced footer link gaps while retaining 44px tap targets, balanced company/legal links across two columns, and enlarged the newsletter input to prevent mobile focus zoom.
- Reserved footer clearance for booking and comparison bars, including when both are present, so the last social/support link can be reached.
- Let the mobile hero grow with its text and controls instead of clipping them inside a viewport-based fixed height.
- Kept checkout actions after payment fields in normal document flow so they do not cover account details or upload controls.
- Removed the fixed minimum height from mobile booking activity charts, aligned date/count/meter rows, and suppressed the generic empty-list message on populated overview screens.
- Restored the package/date/time selector previously hidden on mobile trainer profiles.
- Restored access to the trainer client list after opening a client.
- Made all onboarding sections directly accessible on phones.
- Preserved form references across asynchronous confirmation dialogs.
- Used the existing accessible dialog primitive for confirmations, payout requests, and booking scheduling: keyboard focus stays in the dialog, Escape closes it, and background scrolling is locked.
- Exposed existing booking scheduling/cancellation controls inside the customer Bookings section.
- Made legacy Bookings/Messages links open the correct phone section, restored pre-booking coach conversations, and added conversation selection.
- Placed active booking controls first, with past bookings and session history available in compact expandable summaries.
- Gave completed, cancelled, expired, refund, and rejected-payment screens accurate status copy.
- Prevented profile availability labels from mismatching server and client timezones during hydration.
- Contained recruitment/order imagery and applied consistent cover crops.
- Replaced duplicated payment-account copy text with accessible copy buttons and feedback.

## Repeatable verification

Install Playwright’s Chromium and WebKit browsers (`npx playwright install chromium webkit`). The mobile test harness also requires OpenSSL to generate its temporary localhost HTTPS certificate. HTTPS allows WebKit to test production secure-session cookies without weakening the application’s authentication settings.

```sh
npm run build
npm run test:mobile
npm run test:e2e
npm test
npm run lint
```

The mobile suite uses Android Chromium and iPhone WebKit browser emulation. It exercises widths **320, 360, 375, 390, 414, and 430px**, including 320×568, 360×800, 375×812, 390×844, 414×896, and 430×932 viewports. Additional touch/motion checks cover 375×667 and 412×915. Checks include document/control overflow, complete dialog bounds, menu/filter interactions, matching transitions, onboarding sections, role-specific records, registration, and payment-proof submission. Additional regressions check hero content bounds, actual footer hit targets at the end of the document, visible drawer identity/account/logout controls, Escape dismissal, and focus restoration at every requested width. Reduced-motion and regular-motion behavior are covered.

Screenshots and route/viewport reports are generated under `test-results/mobile/`. The mobile fixtures are loaded only when `MOBILE_AUDIT=1` into the test server’s newly created in-memory MongoDB replica set. No production database or payment provider is used. Existing backend and availability tests cover domain behavior separately.

Browser emulation does not replace checking physical iPhones and Android phones, particularly virtual keyboards, device notches, installed-app behavior, and payment-provider behavior. Safe-area CSS and readable native form controls are implemented, but those physical-device behaviors remain a release check.
