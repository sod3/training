# SPOTTER design and media notes

Spotter uses a restrained premium fitness-tech visual system: warm off-white, near-black and charcoal surfaces, lime reserved for important calls to action, Geist through `next/font`, and Framer Motion transitions that honor reduced-motion preferences.

## Product-specific design rules

- Spotter is online-only. Do not introduce map, area, distance, city or in-person training UI.
- Public trainer cards/profiles must always come from approved database records; never create fictional trainer cards, ratings, reviews or marketplace statistics for production.
- When there are no approved trainers, show a polished truthful empty state instead of sample coaches.
- Filter controls appear only when real approved/bookable trainers provide more than one useful value.
- Trainer onboarding uses controlled category, specialty, language and timezone menus. Biography/headline/package copy remains trainer-authored content because it is not used as a filter taxonomy.
- Identity and certification badges are separate and only appear after the corresponding admin approval.
- Mobile calendars, checkout, verification forms, admin evidence review and review composition are primary UI surfaces, not desktop-only afterthoughts.

## Media

`public/Trainer.mp4` is the homepage hero media. `public/images/coaching.webp` is used as supporting editorial/authentication imagery. They are illustrative brand media only and must not be presented as real trainer identities, testimonials or verified customers.

Real trainer profile imagery is uploaded by trainers and served from protected MongoDB-backed Upload records after it is attached to the trainer/account profile.

## Verification

When dependencies and a test database are available, run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Additional visual checks can use `tests/responsive-audit.cjs` and `tests/visual-audit.cjs` against the production build on port 3200. Keep generated QA screenshots outside the production package.
