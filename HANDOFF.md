# HANDOFF (also saved as CLAUDE.md): read this first

You are continuing work on the AgriTrade Suite for Fathy Eid. Owner language is Arabic (Egyptian); reply to him in Arabic unless he writes English.

## What it is
Eight programs under one portal and one URL (https://agritrade-suite.vercel.app): IOM, Team Workspace, Grain Storage, Dispute Center, Trade Institutions, Feed Formulation, Poultry Intelligence, Chart. One Google sign-in (admin: fathyeid620@gmail.com). Arabic/RTL and English. Free tier only.

Do NOT touch the separate apps AgriTrade Pro, Lisan and Athar. The suite brand shown in the UI is "Agritrade Pro" (Fathy's wording in his design prompt), which is not the real AgriTrade Pro app; do not modify that app.

## How it works
- The portal (`portal/`) shows the menu and loads each program in an iframe at `/<program>/`. All programs share one origin, so one Supabase session works for all.
- `portal/app.js`: sign-in, menu, language toggle, SSO bridge (`seedSso`: copies the portal session into Feed `ffi_sb_session` and Poultry `pl_sb_session`; Grain logs in through RPC `gs_sso`), sub-section menu per program (`SUBS`, `PORTAL_FIX` selectors), Arabic overlay for Institutions (`translateFrame`).
- `portal/hub.js`: home roll-up, Parties Directory, Commodities, Cross-program links (posting engine).
- `portal/ds/ds.css` and `ds.js`: shared light design system injected into iom, team, grain, dispute, inst, feed by `tools/build.py`. It forces light theme, hides dark toggles, wraps tables with search, sort and pagination (8+ rows), and keeps phone layouts from overflowing sideways. The Chart keeps its own look.
- `tools/build.py` copies each program into `docs/<program>/` and applies small patches (paths under `/<program>/`, Supabase project, redirects, language fixes). Edit sources in `programs/` or `portal/`, never `docs/`.
- Language keys in localStorage: iom `iom.lang`, team `tw_lang`, dispute `dc_lang`, grain `gs_lang`, inst `ti_lang`, chart/feed/poultry `suite_lang`. The portal sets them all when the user toggles. Team used to override the portal language with the profile locale; build.py now prefers `tw_lang`.
- Poultry is not here. `/poultry/*` proxies to https://fathyeid.github.io/poultry-platform/ (repo Fathyeid/poultry-platform, owned by another agent). The portal mirrors its sidebar through selector `aside.side a[data-a=go]`. Re-check the selectors if poultry's markup changes.
- Hosting: GitHub Pages serves `docs/` (https://fathyeid.github.io/agritrade-suite-site/). The Vercel project is a thin gateway (`gateway/`): it proxies every page to Pages and runs the serverless functions (`/team/api/ask`, `/team/api/push`, `/grain/api/assistant`, `/inst/api/news`, `/chart/api/*`). Folder routes need explicit rewrites to `.../index.html` (done in `tools/make_gateway.py`), otherwise Pages redirects the browser to github.io and breaks same-origin login.
- Backend: Supabase project `nimfkykshfijxbgwgkrg`. Tables: `iom_state` (JSON), `dc_*` (dispute), `gs_*` (grain), `poultry_*`, `feed_state`, `tasks`, `approvals`, `transactions`, `activity_log`, `notifications`, `suite_links`. SQL is in `database/`. RLS is on; changes must be additive.
- Grain uses its own login token (`localStorage.gs_tok`, a different JWT subject than the Google user). Reads and writes to `gs_*` need it, so open Grain once after signing in.

## Cross-program links (live)
- IOM receipt (non-draft) to Grain lot: `postReceipt` in hub.js. Traceable (`import_txn_ref` "IOM:<ref>", table `suite_links`), idempotent (unique index on source+destination while posted), reversible (void sets the lot to closed and the link to voided).
- IOM sales order (non-draft) to Dispute contract: `postSale`. Uses new columns `dc_contracts.voided_at` and `source_ref`; Dispute hides voided contracts.
- Not built on purpose: poultry sale to stock (poultry already does it; would double count). Feed batch to poultry feed stock waits for a "save batch" feature in Feed.

## Hard rules
1. Light theme only for the 7 programs (royal and sky blue, green for positive, gold for alerts, white cards, soft shadows, rounded corners). The Chart keeps its own look.
2. Arabic mode must be 100% Arabic, English mode 100% English, no mixing. Typed user data stays as entered. Official organization and treaty names stay Latin.
3. No data loss. Do not delete or edit Fathy's real records. Schema changes are additive only.
4. Void, never delete: any posted record needs a reverse/void action. Cross-program posts must be traceable (source program and id), idempotent, and reversible. Test only with clearly marked TEST data and clean up by voiding.
5. Do not remove modules, permissions or logic; no fake buttons.
6. Mobile: no horizontal overflow at 390 px; tables scroll or become cards.
7. Free tier only. No paid services. Never put secrets in the repo or in chat. Use the anon key only on the client.
8. Test in Arabic and English, desktop, tablet (820 px) and phone (390 px), and after sign-in as admin.

## Known pending items
- Chart standalone app (https://agrichart-pro.vercel.app, project agrichart-pro) is still on v3.50; v3.50b is only in the suite `/chart`.
- The org profile redesign spec was never received.
- Feed: needs a "save batch" feature before a Feed-to-Poultry feed stock link can exist (owned by the Feed repo).
- Arabic test on all programs after the Team language fix, the phone-width menu, and table tools on real rows outside Feed still need a full pass.
- The design pass is a shared light skin (ds.css and ds.js), not a rebuild of each page. Hero photos are replaced by a light gradient.
- Vercel free plan: more than 100 deploys per day are refused. This is why static files are served from GitHub Pages.

## Repos
- This repo: https://github.com/Fathyeid/agritrade-suite-site
- Feed: https://github.com/Fathyeid/feed-formulation
- Poultry: https://github.com/Fathyeid/poultry-platform
