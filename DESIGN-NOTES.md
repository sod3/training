# SPOTTER design and media notes

The homepage contains five moments: cinematic hero, three featured trainers, three concise steps, one illustrative member story, and a final CTA. Warm off-white, near-black and charcoal dominate; lime is reserved for calls to action and selected details. Geist is loaded through next/font. Framer Motion provides shared reveals and honors reduced-motion preferences.

The existing browser-backed demo contract is preserved: saved trainers, comparisons, bookings, calendar export, cancellation, progress, reviews, messages and application review. Matching now has four questions; booking has four stages; applications have seven steps. No live authentication, verification, external messaging, payment gateway or backend was introduced.

## Generated assets

All four assets were made with the built-in image generation tool, visually inspected, and encoded with Sharp as optimized WebP. These are representative fictional people. Original generations remain in the Codex generated_images directory.

| Asset | Size | Use |
| --- | --- | --- |
| public/images/coaching.webp | 75,634 bytes | Hero, editorial, onboarding and authentication |
| public/images/ahmed.webp | 61,980 bytes | Ahmed demo portrait |
| public/images/omar.webp | 45,102 bytes | Omar demo portrait |
| public/images/bilal.webp | 57,386 bytes | Bilal demo portrait |

Hero prompt: A premium 16:9 cinematic editorial photograph inside a sophisticated charcoal and warm concrete gym with natural side-window light. Exactly two fully clothed adult South Asian men: a professional trainer in a charcoal t-shirt coaching a client in an off-white t-shirt through a controlled dumbbell exercise. Compose the men in the right half, leaving dark negative space on the left for website text. Realistic athletic bodies, correct anatomy, genuine concentration, neutral equipment, warm skin tones, restrained desaturation. No lettering, logos, watermark, neon lighting or collage.

Portrait prompt shared direction: A 4:5 waist-up editorial portrait of one fully clothed South Asian male personal trainer. Warm concrete and charcoal premium gym, softly blurred background, natural side-window light, realistic athletic physique and anatomy, restrained desaturation, warm skin tones, calm approachable expression. No text, logos, watermarks or other people.

Portrait subjects: Ahmed, age 32, short dark hair and trimmed beard, charcoal training shirt beside a squat rack. Omar, age 29, textured short black hair, clean shaven, cream athletic t-shirt beside a cable machine. Bilal, age 40, short dark hair with a little grey, trimmed beard, muted olive training shirt.

Remaining sample male headshots and gym environment images are served from Unsplash through Next/Image. Photos are representative and do not establish the fictional trainer identities.

## Verification

Run npm run build and npm run test:e2e against the production preview on port 3200. The integration suite covers 11 widths, all navigation destinations, matching, filters, saving, comparisons, slot conflicts, payment failure, booking persistence, calendar export, cancellation, applications and dashboard actions.

Additional repeatable visual checks: node tests/responsive-audit.cjs and node tests/visual-audit.cjs. These expect the preview on port 3200 and write screenshots under qa/. Visual results and Lighthouse reports are intentionally excluded from Git.

Deployment was not performed. The existing public deployment remains unchanged.
