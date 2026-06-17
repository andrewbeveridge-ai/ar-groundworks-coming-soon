# Apps Script — AR Lead Collector

Versioned copy of the Google Apps Script that powers form submissions,
welcome emails, and unsubscribe handling for all Another Realm ventures.

**This is the source of truth.** The live script runs in the Apps Script
editor — when you change `Code.gs` here, paste the updated file into the
editor and deploy a new web app version for the change to take effect.

## Deploy checklist

After editing `Code.gs`:

1. Open the script in Apps Script editor
2. Replace contents with the updated `Code.gs`
3. **Deploy → Manage deployments → Edit (pencil icon) → New version → Deploy**
4. The web app URL stays the same; the form on the website does not need updating

## One-time setup for v1.3 (unsubscribe)

The `UNSUBSCRIBE_SECRET` script property auto-generates on first welcome email
send. No manual setup needed.

To verify after deploy, run `testUnsubscribeUrl` in the editor — it logs a
working unsubscribe URL you can click to test the full flow.

Netlify blocks `/apps-script/*` at the edge (see `netlify.toml`) so this file
is not publicly served.
