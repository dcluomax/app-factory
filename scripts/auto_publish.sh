#!/bin/bash
# Auto-commit and push new webapps to GitHub
# Called by OpenClaw after building a new webapp
# Usage: ./auto_publish.sh <app-name> "commit message"

set -e

APP_NAME=$1
MSG=${2:-"Add new webapp: $APP_NAME"}
REPO_DIR="/mnt/MainPool/Media/apps/app-factory"
WEBAPPS_DIR="/mnt/MainPool/Media/apps/webapps"

if [ -z "$APP_NAME" ]; then
  echo "Usage: $0 <app-name> [commit message]"
  exit 1
fi

# Copy webapp to repo
if [ -d "$WEBAPPS_DIR/$APP_NAME" ]; then
  echo "Copying $APP_NAME to repo..."
  cp -r "$WEBAPPS_DIR/$APP_NAME" "$REPO_DIR/webapps/"
  
  # Update the landing page index.html if needed
  cp "$WEBAPPS_DIR/index.html" "$REPO_DIR/webapps/" 2>/dev/null || true
fi

cd "$REPO_DIR"

# Check for changes
if git diff --quiet && git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi

# Commit and push
git add -A
git commit -m "$MSG"
git push origin main

echo "Pushed to GitHub: $MSG"
