#!/usr/bin/env bash
# Auto cache-bust for the no-build static site.
# Stamps the current deploy commit's short hash onto the site's own CSS/JS
# references (style.css / site.js) in every HTML file. Runs at build time.
# Netlify provides $COMMIT_REF; falls back to `git rev-parse` or a timestamp.
set -euo pipefail

REF="${COMMIT_REF:-}"
if [ -z "$REF" ]; then
  REF="$(git rev-parse HEAD 2>/dev/null || true)"
fi
if [ -z "$REF" ]; then
  REF="$(date -u +%Y%m%d%H%M%S)"
fi
VER="${REF:0:7}"

count=0
for f in *.html; do
  [ -e "$f" ] || continue
  # Replace an existing ?v=... (or a bare ref) with the current version.
  sed -i -E \
    -e "s#(/css/style\.css)(\?v=[A-Za-z0-9._-]+)?#\1?v=${VER}#g" \
    -e "s#(/js/site\.js)(\?v=[A-Za-z0-9._-]+)?#\1?v=${VER}#g" \
    "$f"
  count=$((count+1))
done

echo "stamp-version: v=${VER} applied to ${count} html files"
