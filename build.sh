#!/bin/sh
# Builds the app into ./index.html (one offline file). Source: labs/lab05-panel-solar (model.js, demo.js, demo.json).
set -e
cd "$(dirname "$0")"
node "$HOME/.claude/skills/simulab/tools/build.mjs" labs/lab05-panel-solar
cp labs/lab05-panel-solar/dist/index.html index.html
echo "listo: $(pwd)/index.html"
