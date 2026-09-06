# Spotter current product direction

Spotter is an **online-only** personal-training marketplace. The previous location-first concept is obsolete and must not be reintroduced into runtime UI, schemas, APIs, seed data or SEO.

## Current discovery model

Customer discovery is deliberately small for launch:

- text search;
- category and specialty filters only when those values exist on approved, active, bookable trainers;
- dynamic sorting;
- a four-question matching flow (goal, experience, preferred time, budget);
- up to three strongest matches followed by separate “Also Recommended” alternatives.

The initial controlled categories are Strength & Muscle, Fat Loss & General Fitness, and Mobility & Functional Fitness. Admin can manage categories/specialties; trainer onboarding uses these menus so public filters do not fragment into arbitrary free-text values.

## Trust and conversion

Trainer profiles distinguish identity verification from certification verification. Reviews are based on completed Spotter bookings. Booking uses real recurring availability, manual JazzCash/EasyPaisa proof, admin confirmation, private messaging and a trainer-provided HTTPS session link.

## Design principle

Keep the premium visual system focused and restrained: strong hierarchy, generous whitespace, useful motion, clear empty/loading/error states, mobile-first forms/calendars and no fake marketplace statistics or fictional review claims.
