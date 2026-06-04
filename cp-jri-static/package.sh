#!/bin/bash
# 打包静态网站，便于 FileZilla SFTP 上传
set -e
cd "$(dirname "$0")"
python3 build.py
ZIP="cp-jri-website-$(date +%Y%m%d).zip"
zip -r "$ZIP" \
  index.html about.html research.html contact.html \
  css js images data \
  news events departments materials \
  -x "*.py" -x "package.sh" -x "*.zip" -x "README.md"
echo "Created: $(pwd)/$ZIP"
echo "Upload all contents inside the zip to your web server root (public_html)."
