#!/bin/bash
# Deploy webapps to Docker nginx on a server
# Usage: ./deploy_webapps.sh [server_ip]

set -e

SERVER=${1:-$YOUR_SERVER_IP}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

if [ -z "$SERVER" ]; then
  echo "Usage: $0 <server_ip>"
  echo "  or set YOUR_SERVER_IP environment variable"
  exit 1
fi

echo "=== Deploying webapps to $SERVER ==="

# Copy webapp files
echo "Copying webapps..."
scp -r "$REPO_DIR/webapps/"* "$SERVER:/path/to/webapps/"

# Copy Docker files
echo "Copying Docker config..."
scp "$REPO_DIR/docker/docker-compose.yml" "$SERVER:/path/to/webapps/"
scp "$REPO_DIR/docker/nginx.conf" "$SERVER:/path/to/webapps/"

# Start/restart container
echo "Starting container..."
ssh "$SERVER" "cd /path/to/webapps && docker compose up -d"

echo "=== Done ==="
echo "Webapps deployed. Configure Cloudflare Tunnel to point subdomains to port 8890."
