# Another Realm Groundworks — Website

Owner-operated property services in Columbus, OH and surrounding suburbs.
Static HTML / CSS / JS — **no framework, no build step.** Just open the files
or serve the folder.

## Pages

| File             | Purpose                                                        |
|------------------|----------------------------------------------------------------|
| `index.html`     | Home — hero, trust signals, services grid, AI Design feature   |
| `services.html`  | Services — grouped Haul / Cleanup / Lawn / Design              |
| `about.html`     | Owner-operated story + licensing/insurance status              |
| `quote.html`     | Free-estimate form (7 fields → AR Lead Collector Apps Script)  |
| `contact.html`   | Phone, email, service area, hours                              |
| `design.html`    | AI Landscape Design — **scaffold, `noindex`, unlinked**        |
| `legal.html`     | Terms / Privacy / Insurance Disclosure (legal entity named here)|

## Structure

```
/                 HTML pages
/css/style.css    all styles
/js/site.js       nav toggle + quote form submit
/assets/          og-share.svg (social card placeholder)
robots.txt        excludes /design.html
sitemap.xml       excludes /design.html
PLACEHOLDERS.md   photo-slot manifest (swap with grep PHOTO-SLOT)
netlify.toml      hosting config + headers
```

## Quote form backend

The quote form POSTs to the live **AR Lead Collector v1** Apps Script `/exec`
endpoint (defined in `js/site.js`). Do **not** rebuild the backend. Fields:
Name, Phone, Email, Service, Job location/zip, Notes, Preferred contact method.

## Photo placeholders

The site ships with branded-graphic placeholders, not stock. To swap in real
photography, `grep -rn "PHOTO-SLOT" .` and replace each placeholder block with an
`<img>` at the documented aspect ratio. See `PLACEHOLDERS.md`.

## Deploy

Netlify, pointed at `anotherrealmgroundworks.com`. Build then review before any
deploy (P56). `/design.html` goes live only at the KB-09 launch gate
(portfolio piece #1) — see the TODO in that file.
