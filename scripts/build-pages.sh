#!/usr/bin/env bash
# Build a static site suitable for GitHub Pages (no PowerShell server needed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST/Assets" "$DIST/Textures"

cp "$ROOT/index.html" \
   "$ROOT/styles.css" \
   "$ROOT/scene.js" \
   "$ROOT/tweakpaneManager.js" \
   "$ROOT/engravingManager.js" \
   "$ROOT/studio.json" \
   "$DIST/"

# The published site has no /api/textures. Skip that request so the browser console stays clean.
sed -i 's/this.useStaticTextureIndex = false;/this.useStaticTextureIndex = true;/' "$DIST/tweakpaneManager.js"

cp "$ROOT/Assets/asset.js" "$ROOT/Assets/part.bin" "$DIST/Assets/"
cp "$ROOT/Textures/materials.json" "$DIST/Textures/"
# Copy texture images if present
shopt -s nullglob
cp "$ROOT"/Textures/*.{png,jpg,jpeg,webp} "$DIST/Textures/" 2>/dev/null || true
shopt -u nullglob

# Environment map. PBR materials render black when this file is missing on Pages.
if [ -d "$ROOT/Textures/HDR" ]; then
  mkdir -p "$DIST/Textures/HDR"
  cp -a "$ROOT/Textures/HDR/." "$DIST/Textures/HDR/"
fi

# Static texture index. GitHub Pages has no /api/textures (that route exists only in serve.ps1).
texture_list="$(mktemp)"
find "$ROOT/Textures" -maxdepth 1 -type f \
  \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' -o -iname '*.bmp' -o -iname '*.tga' \) \
  -printf '%f\n' | sort -u > "$texture_list"

{
  printf '{\n  "images": ['
  first=1
  while IFS= read -r name || [ -n "$name" ]; do
    [ -z "$name" ] && continue
    escaped=${name//\\/\\\\}
    escaped=${escaped//\"/\\\"}
    if [ "$first" -eq 1 ]; then
      first=0
    else
      printf ','
    fi
    printf '\n    "%s"' "$escaped"
  done < "$texture_list"
  if [ "$first" -eq 0 ]; then
    printf '\n'
  fi
  printf '  ]\n}\n'
} > "$DIST/Textures/texture-list.json"
rm -f "$texture_list"

# Prevent Jekyll from processing the site on GitHub Pages
touch "$DIST/.nojekyll"

echo "Pages build ready in dist/"
