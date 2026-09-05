# Spotter redesign audit — premium product pass

## What was already strong

- Next.js App Router structure with customer, trainer and admin routes.
- Reusable marketplace components for trainer cards, matching, booking and profile pages.
- Browser-backed demo state for saved trainers, comparison, bookings, reviews and messages.
- Framer Motion plus reduced-motion handling.
- Strong fictional male trainer imagery and a cinematic hero asset.
- Existing responsive/e2e audit coverage across the core journey.

## Problems identified

1. The homepage did not yet reflect the six-part product story in the redesign brief. It had no dedicated trust section and no homepage version of Spotter's signature matching experience.
2. The directory included an illustrative fake map with fabricated pin coordinates. That conflicts with the product rule not to fake unsupported map functionality.
3. The 10-second hero video was approximately 9.3 MB, which was too expensive for an above-the-fold media asset.
4. Directory cards repeated "sample reviews / demo profile" inside every card, making the interface feel like a prototype rather than a coherent premium product.
5. The navbar lacked a lightweight location context despite location being central to the marketplace value proposition.
6. The strongest product feature — matching — lived on a separate route but was not demonstrated as a signature product interaction on the homepage.

## Implemented in this pass

- Rebuilt the homepage into six intentional sections: hero, featured trainers, interactive match experience, trust, editorial customer story, final CTA.
- Added an interactive goal selector on the homepage that deep-links into the real four-step matching flow with the selected preference already populated.
- Added a dynamic example match preview using the existing trainer dataset rather than static decorative content.
- Added a restrained trust section for identity, qualifications and reviews, with a clear prototype-data disclaimer.
- Removed the fake map toggle and fake pin rendering from the trainer directory.
- Added a Karachi location context link to desktop navigation.
- Refined directory hierarchy and reduced template-like card treatment through final CSS overrides.
- Updated trainer-card metadata to prioritize useful evaluation information: reviews and experience.
- Added a hero poster and metadata-only preload.
- Re-encoded `public/Trainer.mp4` from ~9.3 MB to ~950 KB at 1280×720 while keeping the same 10-second duration.
- Updated the e2e expectation so QA explicitly verifies that the unsupported fake map is gone.
- Preserved booking, saving, comparison, filtering, matching, dashboards and demo state behavior.

## Important backend dependencies still intentionally not faked

- Real map / exact trainer coordinates and distance calculations.
- Live identity and credential verification.
- Real authentication and account security.
- Payment gateway processing.
- Live messaging and notifications.
- Server-backed availability and booking locks.
- Production analytics and event tracking.

These should be connected when backend services are ready rather than simulated as successful production integrations.

## Verification note

The edited TSX files were syntax-parsed successfully with the TypeScript compiler parser. A full `npm ci` / Next.js production build could not be completed in this environment because dependency installation did not finish, so deployment-level verification should still run `npm ci`, `npm run build`, and the Playwright suite in the normal project environment before production release.
