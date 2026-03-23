#!/usr/bin/env python3
"""
Auto-distribute blog posts to multiple platforms.
Publishes to: Dev.to, Hashnode, Medium, Telegram, and submits sitemap to Google.

Usage:
  python3 auto_distribute.py                    # Distribute latest post
  python3 auto_distribute.py --slug <slug>     # Distribute specific post

Environment variables (or .env):
  WP_USER, WP_APP_PASSWORD, WP_URL
  DEVTO_API_KEY          — from https://dev.to/settings/extensions
  HASHNODE_TOKEN         — from https://hashnode.com/settings/developer
  HASHNODE_PUBLICATION   — your Hashnode publication ID
  MEDIUM_TOKEN           — from https://medium.com/me/settings
  TELEGRAM_BOT_TOKEN     — Telegram bot token
  TELEGRAM_CHAT_ID       — Channel or chat ID
"""

import os, sys, json, re, requests
from pathlib import Path

# Load .env
env_file = Path(__file__).parent.parent / '.env'
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

WP_USER = os.environ.get('WP_USER', '')
WP_PASS = os.environ.get('WP_APP_PASSWORD', '')
WP_URL = os.environ.get('WP_URL', '').rstrip('/')
DEVTO_KEY = os.environ.get('DEVTO_API_KEY', '')
HASHNODE_TOKEN = os.environ.get('HASHNODE_TOKEN', '')
HASHNODE_PUB = os.environ.get('HASHNODE_PUBLICATION', '')
MEDIUM_TOKEN = os.environ.get('MEDIUM_TOKEN', '')
TG_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TG_CHAT = os.environ.get('TELEGRAM_CHAT_ID', '')


def get_wp_post(slug=None):
    """Get latest or specific post from WordPress."""
    auth = (WP_USER, WP_PASS)
    if slug:
        r = requests.get(f"{WP_URL}/wp-json/wp/v2/posts?slug={slug}", auth=auth)
    else:
        r = requests.get(f"{WP_URL}/wp-json/wp/v2/posts?per_page=1&orderby=date", auth=auth)
    posts = r.json()
    if not posts:
        return None
    post = posts[0]
    # Convert WP HTML to markdown-ish text
    content = post['content']['rendered']
    content = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1', content)
    content = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1', content)
    content = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n\n', content, flags=re.DOTALL)
    content = re.sub(r'<li>(.*?)</li>', r'- \1', content)
    content = re.sub(r'<a href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', content)
    content = re.sub(r'<strong>(.*?)</strong>', r'**\1**', content)
    content = re.sub(r'<em>(.*?)</em>', r'*\1*', content)
    content = re.sub(r'<code>(.*?)</code>', r'`\1`', content)
    content = re.sub(r'<[^>]+>', '', content)
    content = re.sub(r'\n{3,}', '\n\n', content).strip()
    
    return {
        'title': post['title']['rendered'],
        'slug': post['slug'],
        'url': post['link'],
        'content_html': post['content']['rendered'],
        'content_md': content,
        'excerpt': re.sub(r'<[^>]+>', '', post.get('excerpt', {}).get('rendered', ''))[:200],
    }


def publish_devto(post):
    """Publish to Dev.to via API."""
    if not DEVTO_KEY:
        return 'SKIP (no DEVTO_API_KEY)'
    
    # Add canonical URL to avoid SEO penalty
    body = {
        "article": {
            "title": post['title'],
            "body_markdown": post['content_md'] + f"\n\n---\n*Originally published at [{WP_URL}]({post['url']})*",
            "published": True,
            "canonical_url": post['url'],
            "tags": ["webdev", "opensource", "privacy", "tools"],
        }
    }
    r = requests.post("https://dev.to/api/articles", json=body,
                      headers={"api-key": DEVTO_KEY, "Accept": "application/vnd.forem.api-v1+json"})
    if r.status_code in (200, 201):
        return f"OK -> {r.json().get('url', '?')}"
    return f"FAIL ({r.status_code}): {r.text[:100]}"


def publish_hashnode(post):
    """Publish to Hashnode via GraphQL API."""
    if not HASHNODE_TOKEN or not HASHNODE_PUB:
        return 'SKIP (no HASHNODE_TOKEN)'
    
    query = """
    mutation PublishPost($input: PublishPostInput!) {
        publishPost(input: $input) {
            post { url }
        }
    }"""
    variables = {
        "input": {
            "title": post['title'],
            "contentMarkdown": post['content_md'],
            "publicationId": HASHNODE_PUB,
            "originalArticleURL": post['url'],
            "tags": [{"slug": "web-development"}, {"slug": "privacy"}],
        }
    }
    r = requests.post("https://gql.hashnode.com",
                      json={"query": query, "variables": variables},
                      headers={"Authorization": HASHNODE_TOKEN})
    if r.status_code == 200 and 'errors' not in r.json():
        url = r.json().get('data', {}).get('publishPost', {}).get('post', {}).get('url', '?')
        return f"OK -> {url}"
    return f"FAIL: {r.text[:100]}"


def publish_medium(post):
    """Publish to Medium via API."""
    if not MEDIUM_TOKEN:
        return 'SKIP (no MEDIUM_TOKEN)'
    
    # Get user ID first
    r = requests.get("https://api.medium.com/v1/me",
                     headers={"Authorization": f"Bearer {MEDIUM_TOKEN}"})
    if r.status_code != 200:
        return f"FAIL (auth): {r.status_code}"
    user_id = r.json()['data']['id']
    
    body = {
        "title": post['title'],
        "contentFormat": "html",
        "content": post['content_html'],
        "canonicalUrl": post['url'],
        "publishStatus": "public",
        "tags": ["web-development", "privacy", "tools", "open-source"],
    }
    r = requests.post(f"https://api.medium.com/v1/users/{user_id}/posts",
                      json=body,
                      headers={"Authorization": f"Bearer {MEDIUM_TOKEN}"})
    if r.status_code in (200, 201):
        return f"OK -> {r.json()['data'].get('url', '?')}"
    return f"FAIL ({r.status_code}): {r.text[:100]}"


def publish_telegram(post):
    """Send to Telegram channel."""
    if not TG_TOKEN or not TG_CHAT:
        return 'SKIP (no TELEGRAM_BOT_TOKEN)'
    
    text = f"📝 New post: *{post['title']}*\n\n{post['excerpt']}\n\n🔗 {post['url']}"
    r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                      json={"chat_id": TG_CHAT, "text": text, "parse_mode": "Markdown",
                            "disable_web_page_preview": False})
    return "OK" if r.status_code == 200 else f"FAIL: {r.text[:100]}"


def main():
    slug = None
    if '--slug' in sys.argv:
        slug = sys.argv[sys.argv.index('--slug') + 1]
    
    post = get_wp_post(slug)
    if not post:
        print("No post found")
        return
    
    print(f"Distributing: {post['title']}")
    print(f"Source: {post['url']}")
    print()
    
    results = {
        'Dev.to': publish_devto(post),
        'Hashnode': publish_hashnode(post),
        'Medium': publish_medium(post),
        'Telegram': publish_telegram(post),
    }
    
    print("Results:")
    for platform, result in results.items():
        print(f"  {platform}: {result}")


if __name__ == "__main__":
    main()
