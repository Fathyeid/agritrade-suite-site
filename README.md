# AgriTrade Suite

One web portal that holds eight programs behind one Google sign-in, in Arabic (RTL) and English.

Live URL (single, merged): https://agritrade-suite.vercel.app

| # | Program | Folder | Live path |
|---|---------|--------|-----------|
| 1 | IOM (operations, receipts, sales orders) | `programs/iom` | /iom/ |
| 2 | Team Workspace | `programs/team` | /team/ |
| 3 | Grain Storage | `programs/grain` | /grain/ |
| 4 | Dispute and Arbitration Center | `programs/dispute` | /dispute/ |
| 5 | Trade Institutions | `programs/inst` | /inst/ |
| 6 | Feed Formulation | `programs/feed/src` (snapshot of repo Fathyeid/feed-formulation, built into the suite) | /feed/ |
| 7 | Poultry Intelligence | `programs/poultry/src` (snapshot of repo Fathyeid/poultry-platform) | /poultry/ |
| 8 | Chart (market charts) | `programs/chart` | /chart/ |

Original repos (still live with their own GitHub Pages, untouched): Feed https://github.com/Fathyeid/feed-formulation , Poultry https://github.com/Fathyeid/poultry-platform .

Important: `/feed/` is built from `programs/feed/src` into `docs/feed`. `/poultry/` is still served by proxy from the ORIGINAL poultry repo's Pages (https://fathyeid.github.io/poultry-platform/), so the live poultry changes only when that repo changes. `programs/poultry/src` is a full copy so everything is in one place; to make the suite serve its own copy, add `programs/poultry` to the copy list in `tools/build.py` and change the `/poultry` rewrites in `tools/make_gateway.py`.

Read `HANDOFF.md` (also copied as `CLAUDE.md`) before changing anything.

## Layout

```
portal/      suite shell: index.html, app.js (menu, sign-in, language, SSO bridge), hub.js (home, directory, links), style.css, ds/ (shared light design system)
programs/    one folder per program; each has src/ (its own static files, and api/ if it has serverless code)
tools/       build.py (assembles everything), make_gateway.py (creates the thin Vercel project)
docs/        BUILD OUTPUT (the static site). GitHub Pages serves this folder. Do not edit by hand.
gateway/     BUILD OUTPUT (the Vercel project: serverless functions + proxy rules). Deployed to Vercel.
database/    SQL used on the Supabase project (additive migrations)
```

## Build and publish

```
python3 tools/build.py          # rebuilds docs/ from portal/ and programs/
python3 tools/make_gateway.py   # makes gateway/ and strips server files from docs/
git add -A && git commit -m "..." && git push   # GitHub Pages republishes docs/ in about a minute
```

Pages changes go live by pushing to `main`; no Vercel deploy is needed. Only changes to `gateway/` (serverless functions or proxy rules) need a Vercel deploy:
`cd gateway && npx vercel deploy --prod` (project `agritrade-suite`, id `prj_IEN2B8jJ7TwPq20iQACFHMZLzqte`, team `team_SHCbuzUlB0YpIc6MV0tYcMUE`). The Vercel free plan refuses more than 100 deploys a day.

## Secrets

None are in this repo. Only the Supabase public (anon) key appears in config files, which is meant to be public. Serverless functions read these Vercel environment variables: `GROQ_API_KEY`, `PUSH_SECRET`, `VAPID_PUBLIC`, `VAPID_PRIVATE`, `SB_ANON`. Never commit tokens, service-role keys or `.env` files.
