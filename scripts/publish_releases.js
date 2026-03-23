const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const PROFILE = path.join(os.homedir(), 'ChromePlayConsole');
const BASE = 'https://play.google.com/console/u/0/developers/process.env.DEVELOPER_ID || 'YOUR_DEVELOPER_ID'';
const SHOTS = path.join(__dirname, 'screenshots');

const APPS = [
  { key: 'focusforge', id: 'process.env.FOCUSFORGE_ID || 'FOCUSFORGE_APP_ID'' },
  { key: 'noiselog', id: 'process.env.NOISELOG_ID || 'NOISELOG_APP_ID'' },
];

function log(msg) { console.log('[' + new Date().toISOString().slice(11,19) + '] ' + msg); }

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  var context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome', headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--disable-extensions'],
    viewport: { width: 1440, height: 900 }, timeout: 60000,
  });
  var page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(30000);

  for (var i = 0; i < APPS.length; i++) {
    var app = APPS[i];
    log('\n=== ' + app.key + ' ===');

    // Go to internal testing
    await page.goto(BASE + '/app/' + app.id + '/tracks/internal-testing', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // Click "Edit release" to get back to the draft
    try {
      var editBtn = page.locator('button:has-text("Edit release"), a:has-text("Edit release")').first();
      if (await editBtn.isVisible({ timeout: 3000 })) {
        await editBtn.click();
        await page.waitForTimeout(5000);
        log('  Editing release...');
      }
    } catch {}

    // Click "Next" to go to preview (if we're on the create release page)
    try {
      var nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 3000 }) && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(5000);
        log('  Moved to preview');
      }
    } catch {}

    await page.screenshot({ path: path.join(SHOTS, app.key + '_publish_01.png') }).catch(function(){});

    // Click "Save and publish" or "Start rollout to Internal testing"
    var published = false;
    for (var text of ['Save and publish', 'Start rollout to Internal testing', 'Start rollout']) {
      try {
        var btn = page.locator('button:has-text("' + text + '")').first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click();
          log('  Clicked: ' + text);
          await page.waitForTimeout(3000);
          published = true;
          break;
        }
      } catch {}
    }

    // Confirm dialog if any
    if (published) {
      try {
        var confirmBtn = page.locator('button:has-text("Rollout"), button:has-text("Publish"), button:has-text("Save and publish")').last();
        if (await confirmBtn.isVisible({ timeout: 3000 })) {
          await confirmBtn.click();
          await page.waitForTimeout(5000);
          log('  Confirmed!');
        }
      } catch {}
    }

    await page.screenshot({ path: path.join(SHOTS, app.key + '_publish_02_done.png') }).catch(function(){});
    log('  ' + (published ? '✅ Published!' : '⚠ Could not publish'));
  }

  log('\nDone!');
  await context.close();
})();
