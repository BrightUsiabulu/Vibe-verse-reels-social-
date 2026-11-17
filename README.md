# VibeVerse — recovered live application

Current live site: https://vibeverse-bright-studio.vercel.app/

## Recovery status (17 November 2026)

- 108 frontend files (HTML/CSS/JS/SVG/web manifest) recovered from the latest known production deployment and saved in this branch.
- Two small backend source files recovered: `api/status.mjs` and `api/verify.mjs`.
- Google AdSense ownership-verification script added to `index.html` using publisher ID `ca-pub-3767027718493089`.
- `main` and the existing Vercel production deployment have NOT been modified.

## Incomplete — do not deploy or merge yet

The original deployment has 176 source/deployment entries, but this GitHub snapshot is **not yet functionally equivalent**.
Important missing components include:
- `lib/vv-backend.mjs` and most `api/*.mjs` functions for live, checkout, webhook, wallet, and payouts.
- Three PNG application icons and production build configuration.
- Original SQL/database setup scripts and engineering notes.
- Production environment variables and external account configuration (not to be committed to GitHub).

The two recovered API modules depend on the currently missing backend library. They are archived for source recovery, not operational.

## Next steps

1. Locate the **original full source folder or deployment archive** used by Vercel; securely recover backend source (and review the code for embedded secrets).
2. Restore required PNGs and build/deployment configuration.
3. Recreate sensitive environment variables inside Vercel dashboard; **never** put secret keys in this public repository.
4. Test a separate preview deployment and verify routes, login, uploads, payments, and admin behavior.
5. Only after preview validation, consider reconnecting the GitHub repository or merging to `main`. The live application must not be replaced by this incomplete copy.
6. Once verification code is live, continue Google AdSense ownership verification and the site-review process. Code insertion alone does not activate revenue.

## Security

No `.env` files, server secrets, payment provider private keys or database service-role keys belong in this public repository.
