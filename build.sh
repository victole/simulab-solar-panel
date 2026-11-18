#!/bin/sh
# Builds the app into ./index.html (one offline file). Source: model.js, demo.js, demo.json.
set -e
cd "$(dirname "$0")"
node "$HOME/.claude/skills/simulab/tools/build.mjs" .
cp dist/index.html index.html   # dist/ stays: the kit tools (stills, video) read it
# Vercel Web Analytics (only in the published copy; offline the script just fails to load)
perl -0pi -e 's#</head>#<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script><script defer src="/_vercel/insights/script.js"></script></head>#' index.html
echo "listo: $(pwd)/index.html"
