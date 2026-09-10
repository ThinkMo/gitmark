#!/usr/bin/env bash
#
# build.sh — package GitMark into a store-ready zip.
#
# Produces dist/gitmark-v<version>.zip containing only the files the extension
# needs at runtime (no git metadata, docs, or OS cruft). The same zip is what
# you upload to the Chrome Web Store / Edge Add-ons and attach to a GitHub
# Release.
#
# Usage: ./build.sh

set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(node -p "require('./manifest.json').version" 2>/dev/null \
  || grep '"version"' manifest.json | sed -E 's/.*"version": *"([^"]+)".*/\1/')

OUT="dist/gitmark-v${VERSION}.zip"

# Fail fast if the manifest isn't valid JSON.
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))" \
  >/dev/null 2>&1 || { echo "✗ manifest.json is not valid JSON"; exit 1; }

# Only the runtime files go into the package.
INCLUDE=(manifest.json icons src popup options editor vendor)

for p in "${INCLUDE[@]}"; do
  [ -e "$p" ] || { echo "✗ missing required path: $p"; exit 1; }
done

rm -f "$OUT"
mkdir -p dist

zip -r -q "$OUT" "${INCLUDE[@]}" \
  -x "*.DS_Store" "*/.DS_Store" "*.map"

echo "✓ built $OUT"
unzip -l "$OUT" | tail -n 1
