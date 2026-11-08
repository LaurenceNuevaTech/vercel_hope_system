# vercel_hope_system

Clickable simulator of the **Hope Account Specialist** system: a broker
platform to buy, sell and rent houses, condos, lots, commercial spaces and
vehicles. Front-end only (React + Vite) with sample data, so it can be
published on Vercel for Hope to try. The proposal and the mobile developer
guide are kept locally in `docs/` (confidential, not in the repository).

> Everything is saved in **this browser only** (localStorage) and shared by the
> website, the customer portal, the staff portal and the phone simulator.
> "Reset all demo data" (on every sign-in page and in Settings → Demo data)
> restores the sample data.

## Try it

| Address | What it is |
|---|---|
| `/` | Public website: search, listings (guest view hides the agent's number and the exact address), share links with QR flyer, agents, loan calculator, Sell with Hope |
| `/account` | Customer portal: saved listings, messages with the agent, viewings, deals with document checklist, pay online (simulated PayMongo), receipts, profile & security |
| `/admin` | Staff portal (accounts below) |
| `/mobile` | Phone simulator: customer and agent app, PIN and Face ID / fingerprint sign-in |
| `/flows` | Flowcharts and the API reference for the mobile developer |

Staff accounts (password `Demo@2026!`, authenticator code `123456`):

| Email | Role |
|---|---|
| superadmin@nuevatech.test | Super Admin (NuevaTech, third-party system provider: support, integrations, confirms Hope's fee payments) |
| owner@hope.test | Owner (runs the business, sets commission and NuevaTech fee rules) |
| admin@hope.test | Admin |
| manager@hope.test | Manager – Team Metro Manila |
| manager2@hope.test | Manager – Team Cavite & Laguna |
| finance@hope.test | Finance |
| editor@hope.test | Content Editor |
| agent@hope.test … agent6@hope.test | Agents |

Customer: `customer@demo.test` / `Demo@2026!` (new accounts: one-time code `246810`).

Things to demo:

- **Listing approval**: an agent submits, the team Manager approves / requests changes / rejects; the listing's History tab shows every edited field (old → new).
- **Guest gate**: anyone can open a listing or a shared link; asking, saving or booking needs an account. Inquiries remember the share channel (`?ch=facebook`).
- **Deals and money**: live computation (commission → agent / manager split → Hope share → NuevaTech fee → Hope net), closing locks it and creates commission vouchers and the platform fee.
- **NuevaTech fee (set by the Owner, modular)**: NuevaTech is the third-party system provider. The Owner sets the fee: on / off and default (Settings → NuevaTech platform fee), rules per category and sale / rent (NuevaTech billing → Fee rules), or a fee for one deal (deal page). Each is a percent of Hope's commission, a percent of the deal price, or a fixed amount.
- **NuevaTech billing**: monthly statements, the Owner pays with proof, the Super Admin (NuevaTech) confirms and issues the receipt.
- **Branding**: Hope logo and slogan, black and gold; logo, colours and slogan are editable in Settings → Company & branding.
- **File storage (S3)**: Settings → Integrations → S3 file storage (Amazon S3, Cloudflare R2, DigitalOcean Spaces, Wasabi or any S3-compatible), with upload limits, photo resizing, watermark and private documents in Settings → System & maintenance.
- **Printables**: acknowledgement receipts, commission vouchers, deal sheet, statement of account, NuevaTech receipt, listing flyer.
- **Settings & CMS**: every rule (commission, platform fee, listing rules, deals, security, maintenance), homepage, categories, locations, pages, FAQs, announcements, message templates, branding, integrations (enter keys → Test → switch on).
- **Roles & permissions**: edit the permission matrix, rename roles, add roles.
- **Security** (same as SJCMPC): 3 wrong passwords lock 15 minutes, a 2nd lockout flags the account; staff authenticator codes with recovery codes and trusted devices; PIN / biometric device keys on the phone.
- **Audit logs** and **Analytics** with CSV export.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build
```

## Publish on Vercel

1. Push this repository to GitHub.
2. On [vercel.com](https://vercel.com): **Add New → Project → Import** the repository.
3. Vercel reads `vercel.json` (framework Vite, build `npm run build`, output `dist`). Press **Deploy**.

Only `dist/` is published. `docs/` is git-ignored.

## Structure

```
src/
  lib/       catalog.js (categories, roles, permissions, Settings catalog, integrations, CMS defaults)
             seed.js (sample data), money.js (commission and fee computation), actions.js (business actions + audit),
             auth.js (lockout, authenticator, PIN rules, permissions), apiSpec.js (planned REST API + mobile screens),
             analytics.js, store.jsx (browser storage), art.js (drawn sample photos), format.js, icons.jsx
  site/      public website, customer sign-in and portal
  admin/     staff portal
  mobile/    phone simulator
  flows/     flowcharts and API reference
  printables.jsx   receipts, vouchers, statements
docs/        documentation (Word / PDF), diagrams, mobile tracker, generator
```

The real system (Laravel backend, MySQL, the same API for the website and
the app) is described in `docs/Hope-System-Documentation.pdf`.
