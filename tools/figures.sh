#!/bin/sh
# Render every PDF in assets/img/research/ to a PNG beside it, so the Research
# page can show it. macOS only — qlmanage rasterises the vector PDF straight to
# the target width, which is why the result is crisp rather than upscaled.
#
#   ./tools/figures.sh
#
# Then point the matching `figure:` in _data/thrusts.yml at the .png.
set -e
dir="$(cd "$(dirname "$0")/.." && pwd)/assets/img/research"
width=900
found=0
for pdf in "$dir"/*.pdf; do
  [ -e "$pdf" ] || continue
  found=1
  base=$(basename "$pdf" .pdf)
  qlmanage -t -s "$width" -o "$dir" "$pdf" >/dev/null 2>&1
  mv "$dir/$base.pdf.png" "$dir/$base.png"
  echo "  $base.pdf -> $base.png ($width px wide)"
done
[ "$found" = 1 ] || echo "  no PDFs in $dir"
