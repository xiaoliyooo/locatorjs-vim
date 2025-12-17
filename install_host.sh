#!/bin/bash
# Locator Vim - Native Host Installation Script for macOS

set -e

echo "🚀 Installing Locator Vim Native Host..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_DIR="$SCRIPT_DIR/native-host"
HOST_SCRIPT="$HOST_DIR/locator_vim_host"  # Wrapper script (no .js)
HOST_JS="$HOST_DIR/locator_vim_host.js"   # Actual JS script
MANIFEST_TEMPLATE="$HOST_DIR/com.locatorvim.host.json"

# Native messaging hosts directory for Chrome on macOS
CHROME_NATIVE_HOSTS_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

# Also support Chromium and other Chromium-based browsers
CHROMIUM_NATIVE_HOSTS_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"

# Make the host scripts executable
chmod +x "$HOST_SCRIPT"
chmod +x "$HOST_JS"
echo "✅ Made host scripts executable"

# Ask for the extension ID
echo ""
echo "📋 Please enter your Chrome extension ID:"
echo "   (You can find this at chrome://extensions after loading the extension)"
read -p "Extension ID: " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo "❌ Error: Extension ID is required"
    exit 1
fi

# Create manifest with correct paths and extension ID
MANIFEST_CONTENT=$(cat <<EOF
{
    "name": "com.locatorvim.host",
    "description": "Locator Vim Native Messaging Host",
    "path": "$HOST_SCRIPT",
    "type": "stdio",
    "allowed_origins": [
        "chrome-extension://$EXTENSION_ID/"
    ]
}
EOF
)

# Install for Chrome
mkdir -p "$CHROME_NATIVE_HOSTS_DIR"
echo "$MANIFEST_CONTENT" > "$CHROME_NATIVE_HOSTS_DIR/com.locatorvim.host.json"
echo "✅ Installed native host manifest for Chrome"

# Install for Chromium (if directory exists or user wants it)
if [ -d "$HOME/Library/Application Support/Chromium" ]; then
    mkdir -p "$CHROMIUM_NATIVE_HOSTS_DIR"
    echo "$MANIFEST_CONTENT" > "$CHROMIUM_NATIVE_HOSTS_DIR/com.locatorvim.host.json"
echo "✅ Installed native host manifest for Chromium"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Make sure Kitty is configured with remote control enabled:"
echo "      Add to ~/.config/kitty/kitty.conf:"
echo "      allow_remote_control yes"
echo "      listen_on unix:/tmp/locator_vim_kitty--"
echo ""
echo "   2. Restart Kitty terminal"
echo ""
echo "   3. Reload the Chrome extension at chrome://extensions"
echo ""
echo "   4. You're ready to use Locator Vim!"
echo "      Hold Alt and click on any component to open it in Neovim"
