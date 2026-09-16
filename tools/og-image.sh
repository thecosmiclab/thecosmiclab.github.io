#!/bin/sh
# Render tools/og-image.html to assets/img/og-image.png at exactly 1200x630.
# Uses the Chrome already installed on this Mac; the page pulls Pretendard
# from the CDN, so it needs a network connection.
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --virtual-time-budget=4000 \
  --screenshot="$root/assets/img/og-image.png" \
  "file://$root/tools/og-image.html" >/dev/null 2>&1
echo "  assets/img/og-image.png"
