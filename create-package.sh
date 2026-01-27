#!/bin/bash
# Script to create Chrome Web Store package

echo "📦 Creating Chrome Web Store package..."

# Remove old package if exists
rm -f linkedin-gpt-note-generator.zip

# Create ZIP excluding unnecessary files
zip -r linkedin-gpt-note-generator.zip . \
  -x "*.git*" \
  -x "*.md" \
  -x "PUBLISHING_GUIDE.md" \
  -x "create-package.sh" \
  -x "node_modules/*" \
  -x ".DS_Store" \
  -x "*.log" \
  -x ".vscode/*" \
  -x ".idea/*"

echo "✅ Package created: linkedin-gpt-note-generator.zip"
echo ""
echo "📋 Files included:"
unzip -l linkedin-gpt-note-generator.zip | tail -1
echo ""
echo "🚀 Ready to upload to Chrome Web Store!"
echo "   Go to: https://chrome.google.com/webstore/devconsole"
