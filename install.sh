#!/usr/bin/env bash
set -e

# Skills Exchange for Claude Code
# Installs the `skillshare` CLI globally and sets up slash commands.

REPO="https://github.com/Enspy/skillshare"

echo ""
echo "  ⚡ Installing Skills Exchange for Claude Code"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "  Error: Node.js is required (>= 18)."
  echo "  Install it from https://nodejs.org and run this script again."
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "  Error: Node.js >= 18 required (you have $NODE_VER)."
  exit 1
fi

# Check npm
if ! command -v npm &>/dev/null; then
  echo "  Error: npm is required."
  exit 1
fi

# Detect install method
if command -v skillshare &>/dev/null; then
  echo "  Updating skillshare-cc..."
  npm install -g skillshare-cc --silent
else
  echo "  Installing skillshare-cc from npm..."
  npm install -g skillshare-cc --silent
fi

echo "  Installed: $(skillshare --version 2>/dev/null || echo 'skillshare')"
echo ""
echo "  Run this inside Claude Code to finish setup:"
echo ""
echo "    /skills-init"
echo ""
echo "  Or in your terminal:"
echo ""
echo "    skillshare init"
echo ""
