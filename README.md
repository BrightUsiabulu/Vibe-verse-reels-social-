# VibeVerse — current live frontend snapshot

Recovered from Vercel production deployment on 17 November 2026.

Live application: https://vibeverse-bright-studio.vercel.app/

## What is here
108 recovered text frontend assets: the current HTML pages, JavaScript, CSS, SVG icon, service worker and web manifest. These are the files served to browsers by that deployment, not the old Lovable frontend.

## Important — not yet a complete deployable source project
This snapshot does **not** include binary icons (PNG), private source-only project files, server-side API modules (such as payment/webhook and payout code), required hosting configuration, secrets, or data/database infrastructure. Do not replace the current production deployment with this branch yet.

Backend credentials must be stored as environment variables, never committed to this public repository. Review all source code and remove credentials before merging to the default branch.

## Current status
Restored on branch `vibeverse-current-snapshot`; default branch `main` remains unchanged.

The website is still served by the original Vercel deployment. Production integration, API restoration, test/build verification and AdSense verification remain separate steps.
