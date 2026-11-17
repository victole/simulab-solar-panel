#!/bin/sh
# Builds the app into ./index.html (one offline file). Source: model.js, sim-data.js, demo.js, demo.json.
set -e
cd "$(dirname "$0")"
node "$HOME/.claude/skills/simulab/tools/build.mjs" .
mv dist/index.html index.html && rmdir dist
echo "listo: $(pwd)/index.html"
