#!/bin/bash
# Script to replace deprecated 'ephemeral: true' with 'flags: [64]' in all JS files

echo "Fixing deprecated ephemeral syntax in all JS files..."

# Find all .js files in src/ and replace ephemeral: true with flags: [64]
find src/ -name "*.js" -type f -exec sed -i 's/ephemeral: true/flags: [64]/g' {} +

echo "✅ All instances of 'ephemeral: true' have been replaced with 'flags: [64]'"
echo ""
echo "Verifying the fix..."
remaining=$(grep -r "ephemeral: true" src/ 2>/dev/null | wc -l)
echo "Remaining instances: $remaining"
