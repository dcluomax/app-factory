#!/usr/bin/env python3
"""
Publish blog posts to WordPress via REST API.
Uses application password authentication (no wp-admin login needed).

Usage:
  python3 publish_blog.py                    # Publish all posts
  python3 publish_blog.py quickshrink       # Publish one post
  
Environment variables (or .env file):
  WP_USER, WP_APP_PASSWORD, WP_URL
"""

import os, sys, json, requests
from pathlib import Path

# Load .env if exists
env_file = Path(__file__).parent.parent / '.env'
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

WP_USER = os.environ.get('WP_USER', '')
WP_PASS = os.environ.get('WP_APP_PASSWORD', '')
WP_URL = os.environ.get('WP_URL', '').rstrip('/')
AUTH = (WP_USER, WP_PASS)
API = f"{WP_URL}/wp-json/wp/v2"

if not all([WP_USER, WP_PASS, WP_URL]):
    print("Set WP_USER, WP_APP_PASSWORD, WP_URL in .env or environment")
    sys.exit(1)


# Blog post content for each app
POSTS = {
    "quickshrink": {
        "title": "QuickShrink: Why I Built a Browser-Based Image Compressor",
        "slug": "quickshrink-image-compressor",
        "content": """<!-- wp:paragraph -->
<p><strong>TL;DR:</strong> QuickShrink compresses your images up to 80% smaller — entirely in your browser. No upload, no account, no tracking.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>The Canvas API Makes Servers Unnecessary</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Most online image compressors upload your photos to a server. QuickShrink takes a different approach: everything happens in your browser using the HTML5 Canvas API. Your images never touch a server.</p>
<!-- /wp:paragraph -->

<!-- wp:list {"ordered":true} -->
<ol>
<li>The browser reads the file into memory (no network request)</li>
<li>A Canvas element renders the image at its native resolution</li>
<li><code>canvas.toBlob()</code> re-encodes it at your chosen quality</li>
<li>You download the result directly from browser memory</li>
</ol>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>Total data transmitted over the network: <strong>zero bytes</strong>. It's also a PWA — install it to your home screen for offline use.</p>
<!-- /wp:paragraph -->""",
    },
    "pixelstrip": {
        "title": "PixelStrip: Your Photos Are Broadcasting Your Location",
        "slug": "pixelstrip-exif-remover",
        "content": """<!-- wp:paragraph -->
<p>Every photo taken on a smartphone embeds invisible metadata — including GPS coordinates accurate to within a few meters. PixelStrip strips it all out before you share.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>What's Hiding in Your Photos</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul>
<li><strong>GPS coordinates</strong> — exact location where the photo was taken</li>
<li><strong>Device fingerprint</strong> — phone model, OS version, camera serial number</li>
<li><strong>Timestamps</strong> — date and time of capture</li>
</ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>PixelStrip parses the JPEG binary structure in your browser, shows you what metadata is embedded, and strips it all with one click. No server, no upload.</p>
<!-- /wp:paragraph -->""",
    },
    "typefast": {
        "title": "TypeFast: The Snippet Manager That Lives in Your Browser",
        "slug": "typefast-snippet-manager",
        "content": """<!-- wp:paragraph -->
<p>TypeFast is a lightweight text snippet manager. Save code blocks, email templates, and frequently used text — then paste them with one click. No account needed.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>Four Features, Nothing Else</h2>
<!-- /wp:heading -->

<!-- wp:list {"ordered":true} -->
<ol>
<li><strong>Add a snippet</strong> — title, category, content</li>
<li><strong>Find a snippet</strong> — search or filter by category</li>
<li><strong>Copy a snippet</strong> — one click, clipboard ready</li>
<li><strong>Edit or delete</strong> — because snippets evolve</li>
</ol>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>All data stored in <code>localStorage</code>. No server, no sync, no privacy concerns. Also works as an installable PWA.</p>
<!-- /wp:paragraph -->""",
    },
    "focusforge": {
        "title": "FocusForge: Gamification Tricked Me Into Using a Pomodoro Timer",
        "slug": "focusforge-focus-timer",
        "content": """<!-- wp:paragraph -->
<p>FocusForge adds XP, levels, and streaks to the Pomodoro technique. Every session earns XP. Level up from Rookie to Immortal. Miss a day and your streak resets.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>Three Modes</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul>
<li><strong>Quick 25</strong> — classic Pomodoro</li>
<li><strong>Deep 45</strong> — extended focus</li>
<li><strong>Marathon 60</strong> — full hour</li>
</ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>Free with occasional ads. $1.99 one-time removes them permanently. Available on Google Play.</p>
<!-- /wp:paragraph -->""",
    },
    "noiselog": {
        "title": "NoiseLog: I Built a Sound Meter Because My Neighbor Was Too Loud",
        "slug": "noiselog-sound-meter",
        "content": """<!-- wp:paragraph -->
<p>When I complained about noise, they asked for evidence. NoiseLog turns your phone into a sound level meter that logs incidents and generates reports.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>Three Screens, One Workflow</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul>
<li><strong>Sound Meter</strong> — live dB reading with 60-second chart</li>
<li><strong>Incidents</strong> — tap to log with timestamp and level</li>
<li><strong>Report</strong> — formatted summary for landlords or complaints</li>
</ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>Free with video ads on start. Pro ($1.99/month) removes ads and unlocks unlimited logging. Available on Google Play.</p>
<!-- /wp:paragraph -->""",
    },
}


def get_or_create_category(name):
    r = requests.get(f"{API}/categories?search={name}", auth=AUTH)
    cats = r.json()
    if cats:
        return cats[0]['id']
    r = requests.post(f"{API}/categories", auth=AUTH, json={"name": name, "slug": name.lower()})
    return r.json()['id']


def publish_post(key, post_data):
    cat_id = get_or_create_category("Tools")
    
    # Check if exists
    existing = requests.get(f"{API}/posts?slug={post_data['slug']}", auth=AUTH).json()
    
    payload = {
        "title": post_data["title"],
        "slug": post_data["slug"],
        "content": post_data["content"],
        "status": "publish",
        "categories": [cat_id],
    }
    
    if existing:
        r = requests.post(f"{API}/posts/{existing[0]['id']}", auth=AUTH, json=payload)
        action = "Updated"
    else:
        r = requests.post(f"{API}/posts", auth=AUTH, json=payload)
        action = "Created"
    
    result = r.json()
    print(f"  {action}: {result.get('link', 'ERROR')}")
    return r.status_code in (200, 201)


def main():
    filter_key = sys.argv[1] if len(sys.argv) > 1 else None
    posts = {filter_key: POSTS[filter_key]} if filter_key else POSTS
    
    print(f"Publishing {len(posts)} blog posts to {WP_URL}")
    
    success = 0
    for key, data in posts.items():
        print(f"\n{key}:")
        if publish_post(key, data):
            success += 1
    
    print(f"\n{'='*40}")
    print(f"Published: {success}/{len(posts)}")


if __name__ == "__main__":
    main()
