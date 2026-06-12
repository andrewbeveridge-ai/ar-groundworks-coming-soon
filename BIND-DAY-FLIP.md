# BIND-DAY FLIP — go indexable the moment GL insurance binds

The site is **LIVE on archcitypropertycare.com but NO-INDEX**. The
"Licensed & Insured" claim is already in the page code, so the site must stay
un-crawlable until General Liability insurance is **bound**. The moment GL
binds, do the steps below — it's one small commit to flip the whole site
indexable with the claim fully truthful.

> ⚠️ Do NOT run this before GL is bound. This is the bind gate (Ohio CSPA exposure).
> Email DNS (MX / SPF / DKIM / DMARC) is never touched by any of this.

## What "no-index" is made of right now (3 layers)

1. `<meta name="robots" content="noindex, nofollow">` on every **public** page:
   `index.html`, `services.html`, `lawn-waitlist.html`, `about.html`,
   `contact.html`, `quote.html`, `legal.html`.
   *(`design.html` has its OWN noindex on a separate KB-09 gate — leave it.)*
2. `robots.txt` → `User-agent: *` / `Disallow: /`.
3. `netlify.toml` → `X-Robots-Tag = "noindex, nofollow"` header on `/*`.

## The flip (do all three, then deploy)

### 1. Remove the noindex meta from the 7 public pages
Delete this line from each public page (NOT design.html):
```html
<meta name="robots" content="noindex, nofollow">
```
Quick check that only design.html still has it afterward:
```bash
grep -rl 'name="robots" content="noindex' *.html   # should print ONLY design.html
```

### 2. Open robots.txt back up
Replace the whole file with:
```
User-agent: *
Allow: /
Disallow: /design.html      # design.html keeps its own noindex until KB-09

Sitemap: https://archcitypropertycare.com/sitemap.xml
```

### 3. Drop the site-wide noindex header in netlify.toml
In the `[[headers]]` block `for = "/*"`, delete this line:
```toml
    X-Robots-Tag = "noindex, nofollow"
```

### 4. Commit + deploy
```bash
git add index.html services.html lawn-waitlist.html about.html contact.html quote.html legal.html robots.txt netlify.toml
git commit -m "Bind-day flip: site indexable (GL bound)"
git push
```
Netlify redeploys on push. Verify:
```bash
curl -s https://archcitypropertycare.com/ | grep -i 'noindex'      # expect: no output
curl -sI https://archcitypropertycare.com/ | grep -i 'x-robots'    # expect: no output
curl -s https://archcitypropertycare.com/robots.txt                # expect: Allow: /
```

Then (optional) submit the sitemap in Google Search Console to speed up indexing.

## Still gated AFTER the flip
- `design.html` stays `noindex` + unlinked until **KB-09** (portfolio rendering #1).
  See the comment block at the top of `design.html`.
