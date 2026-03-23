# App Factory 🏭

Automated pipeline for building, deploying, and publishing apps and webapps.

## What's Inside

### `/webapps/` — Browser-based PWA tools
- **QuickShrink** — Image compressor (Canvas API)
- **PixelStrip** — EXIF metadata remover
- **TypeFast** — Text snippet manager

Each is a single HTML file, zero dependencies, works offline as a PWA.

### `/apps/` — Android app source
- **FocusForge** — Pomodoro timer with XP/levels
- **NoiseLog** — Sound level meter with incident logging

### `/scripts/` — Automation scripts
- `login_google.js` — One-time Google login (Playwright persistent profile)
- `create_apps.js` — Batch-create apps in Play Console
- `upload_images.js` — Upload icons/screenshots/feature graphics
- `upload_aab_release.js` — Upload AAB and create release
- `publish_releases.js` — Publish to internal testing
- `setup_testers.js` — Configure tester lists
- `publish_blog.py` — Publish blog posts to WordPress
- `deploy_webapps.sh` — Deploy webapps to Docker/nginx

### `/docker/` — Build infrastructure
- `Dockerfile` — Android build environment (JDK 17 + Node + Android SDK)
- `build.sh` — Build AABs on any Docker host
- `docker-compose.yml` — Nginx for serving webapps

## Quick Start

```bash
# 1. Deploy webapps (requires Docker)
cd docker && docker compose up -d

# 2. Build Android AABs (requires Docker)
cd docker && ./build.sh all

# 3. Publish to Play Console (requires Playwright + Chrome)
cd scripts
npm install playwright
node login_google.js          # First time only
node create_apps.js           # Create apps in console
node upload_images.js         # Upload store listing assets
node upload_aab_release.js    # Upload AAB + create release
node publish_releases.js      # Publish to internal testing

# 4. Publish blog posts
python3 scripts/publish_blog.py
```

## Configuration

Copy `.env.example` to `.env` and fill in your values:
```
WP_USER=your_wp_user
WP_APP_PASSWORD=your_app_password
WP_URL=https://your-site.com
DEVELOPER_ID=your_play_developer_id
CONTACT_EMAIL=your@email.com
PRIVACY_URL=https://your-site.com/privacy-policy/
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  App Source  │────▶│ Docker Build │────▶│  Play Console  │
│  (React Native)   │  (JDK+SDK)   │     │  (Playwright)  │
└─────────────┘     └──────────────┘     └────────────────┘

┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Webapps    │────▶│ Nginx/Docker │────▶│  Cloudflare    │
│  (HTML/JS)  │     │              │     │  Tunnel        │
└─────────────┘     └──────────────┘     └────────────────┘

┌─────────────┐     ┌──────────────┐
│  Blog Posts │────▶│  WordPress   │
│  (Python)   │     │  REST API    │
└─────────────┘     └──────────────┘
```

## License

MIT
