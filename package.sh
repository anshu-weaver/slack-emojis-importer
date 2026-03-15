#!/bin/bash

# Packaging script for Chrome Web Store upload
# Creates a zip file from the extension files

set -e

VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
NAME=$(grep -o '"name": "[^"]*"' manifest.json | cut -d'"' -f4 | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
ZIP_NAME="${NAME}-v${VERSION}.zip"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Packaging ${NAME} v${VERSION}...${NC}"

[ -f "$ZIP_NAME" ] && rm "$ZIP_NAME"

# Add all extension files, excluding dev/meta files
zip -r "$ZIP_NAME" \
    manifest.json \
    *.js \
    *.css \
    icons/ \
    -x "*.DS_Store" "*.git/*" "package.sh" "README.md" "*.zip" \
       "PRIVACY_POLICY.md" "chrome-submission.md" "store/*" "*.svg" \
       "generate_store_assets.py"

echo -e "${GREEN}Package created: ${ZIP_NAME}${NC}"
echo -e "${BLUE}Upload at: https://chrome.google.com/webstore/devconsole${NC}"
