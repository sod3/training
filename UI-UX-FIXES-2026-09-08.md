# SPOTTER UI/UX fixes — 2026-09-08

## Hero navbar / account dropdown
- Increased hero navbar contrast with a dark glass surface so navigation stays readable over bright video frames.
- Fixed the account dropdown inheriting white hero text on a light background.
- Added explicit dark hero dropdown styling, readable foreground colors, hover states, and stronger elevation.

## Admin trainer approval
- Added a focused application review summary showing trainer contact details and readiness checks.
- Added a primary **Approve trainer** action that completes the normal approval workflow in one click.
- One-click approval validates that the trainer has a complete profile, active account, at least one active package, active availability, identity evidence, and a valid certification document.
- The same action approves submitted identity/certification evidence, approves availability, approves the application, and publishes the trainer profile.
- Full application data and non-approval decisions are now tucked into collapsible advanced sections to reduce admin clutter.
- Approval remains audit-logged and the trainer receives a notification.

## Files changed
- `src/app/globals.css`
- `src/components/dashboard/admin-panel.tsx`
- `src/services/dashboard.ts`
- `src/services/trainer-management.ts`
