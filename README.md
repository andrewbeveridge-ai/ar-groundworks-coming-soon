# Arch City Property Care — Website

Owner-operated property services in Columbus, OH and surrounding suburbs.
Static HTML / CSS / JS — **no framework, no build step.** Just open the files
or serve the folder.

> **STATUS: LIVE but NO-INDEX.** The site ships on archcitypropertycare.com
> with a site-wide `noindex` because the "Licensed & Insured" claim is in the
> code and General Liability insurance is being bound. See
> [`BIND-DAY-FLIP.md`](./BIND-DAY-FLIP.md) for the one-step change to go
> indexable the moment GL binds.

## Pages

| File                | Purpose                                                          |
|---------------------|-----------------------------------------------------------------|
| `index.html`        | Home — hero, services, lawn waitlist, why/how/FAQ, final CTA     |
| `services.html`     | Services — available now / lawn waitlist / coming soon           |
| `lawn-waitlist.html`| Lawn Care Waitlist — ZIP-required form + static route explainer  |
| `about.html`        | Owner-operated story + licensing/insurance (license 25-001496)   |
| `quote.html`        | Free-quote form → Supabase `capture-lead`                        |
| `contact.html`      | Phone/text/email, hours + embedded quote form                    |
| `design.html`       | AI Landscape Design — **scaffold, `noindex`, unlinked** (KB-09)  |
| `legal.html`        | Terms / Privacy / Insurance Disclosure (legal entity named here) |

## Structure

```
/                    HTML pages
/css/style.css       all styles (locked palette + Fraunces/Inter)
/js/site.js          nav toggle + Supabase lead capture (quote + waitlist)
/assets/brand/       logo-*-web.png (optimized), source logos, og-share source
/assets/og-share.png social card (1200×630)
robots.txt           Disallow: / while no-index (bind gate)
sitemap.xml          staged for bind-day
netlify.toml         hosting config, headers, old-domain 301
BIND-DAY-FLIP.md     one-step go-indexable instructions
```

## Brand (LOCKED)

- **Palette:** forest `#0D3A1F` / `#144527`, accent green `#245923`, earth brown
  `#553D1F`, cream bg `#F6E9DA`, gold `#D4AF37` (fine detail only), charcoal `#1A1A1A`.
- **Type:** Fraunces (crafted serif headlines) + Inter (grotesk body).
- **Logos:** `logo-horizontal-web.png` (header), `logo-reversed-web.png` (footer),
  `logo-stacked-web.png` (hero/feature). Favicons + og generated from `badge-circle.png`.
- **Footer (locked, no tagline):** © 2026 Arch City Property Care | archcitypropertycare.com

## Lead capture (backend already exists — do NOT rebuild)

Both forms POST JSON to the live Supabase Edge Function:

```
POST https://bgswqjgswlvdazseyhvu.supabase.co/functions/v1/capture-lead
Content-Type: application/json
```

- Hardcoded on every submit: `entity="CBUS"`, `dba="Arch City Property Care"`.
- **Quote** (`index`/`services` CTAs, `quote.html`, `contact.html`):
  `source="archcity-website-quote-form"`.
- **Waitlist** (`lawn-waitlist.html`): `source="archcity-website-waitlist"`,
  `service_wanted="Recurring Mowing (Waitlist)"`, ZIP required and sent as both
  `location` and `zip`.
- Every payload carries the `_hp` honeypot and `consent_sms` + `consent_text`.
  ⚠️ `consent_text` is a **placeholder pending attorney review** (see `js/site.js`).
- Success contract: **only** `{"ok":true}`. Failure `{"ok":false,"error":"<code>"}`
  is never echoed to users — they see a generic "call/text us" line; the code is
  logged to console only.

No key or secret is ever placed in the front-end.

## Compliance guardrails (do not violate)

- No prices anywhere — "Free Quote / Custom Quote" only.
- No invented testimonials or star ratings.
- No pesticide / fertilizer / chemical weed-control services.
- Legal entity (CBUS Express Transport Limited) named only in `legal.html`.

## Deploy

Netlify, pointed at `archcitypropertycare.com` (website DNS only — email DNS is
untouched). Stays no-index until the bind-day flip. `/design.html` goes live only
at its KB-09 gate (portfolio piece #1).
