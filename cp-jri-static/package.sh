#!/bin/bash
set -e
cd "$(dirname "$0")"
python3 build.py
ZIP="jrice-website-$(date +%Y%m%d).zip"
zip -r "$ZIP" index.html about.html research.html contact.html css js images data news events \
  -x "*.py" -x "package.sh" -x "preview.sh" -x "*.zip" -x "README.md" -x "images/events/README.txt"
echo ""
echo "Download link (full repo zip):"
echo "https://github.com/earthohub/eartho/archive/refs/heads/cursor/institute-website-0363.zip"
echo ""
echo "Created: $(pwd)/$ZIP"
