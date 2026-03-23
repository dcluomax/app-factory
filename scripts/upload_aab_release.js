const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const PROFILE = path.join(os.homedir(), 'ChromePlayConsole');
const BASE = 'https://play.google.com/console/u/0/developers/process.env.DEVELOPER_ID || 'YOUR_DEVELOPER_ID'';
const SHOTS = path.join(__dirname, 'screenshots');
const BUILDS = path.join(os.homedir(), 'apps-build');

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
  page.setDefaultTimeout(45000);

  var filterApp = process.argv[2];
  var appsToProcess = filterApp ? APPS.filter(function(a) { return a.key === filterApp; }) : APPS;

  for (var ai = 0; ai < appsToProcess.length; ai++) {
    var app = appsToProcess[ai];
    var aabPath = path.join(BUILDS, app.key + '-release.aab');
    
    log('\n=== ' + app.key + ' ===');
    
    if (!fs.existsSync(aabPath)) {
      log('  AAB not found: ' + aabPath);
      continue;
    }
    log('  AAB: ' + (fs.statSync(aabPath).size / 1048576).toFixed(0) + 'MB');

    // Navigate to internal testing
    await page.goto(BASE + '/app/' + app.id + '/tracks/internal-testing', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SHOTS, app.key + '_release_01.png') }).catch(function(){});

    // Click "Create new release"
    var clicked = false;
    for (var text of ['Create new release', 'Create release', 'Edit release']) {
      try {
        var btn = page.locator('button:has-text("' + text + '"), a:has-text("' + text + '")').first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click();
          clicked = true;
          log('  Clicked: ' + text);
          break;
        }
      } catch {}
    }
    
    if (!clicked) {
      log('  No create release button found');
      await page.screenshot({ path: path.join(SHOTS, app.key + '_release_nobutton.png') }).catch(function(){});
      continue;
    }
    await page.waitForTimeout(5000);

    // Handle "Use Google Play App Signing" opt-in
    try {
      var signingBtn = page.locator('button:has-text("Continue"), button:has-text("Opt in")').first();
      if (await signingBtn.isVisible({ timeout: 3000 })) {
        await signingBtn.click();
        log('  App Signing opted in');
        await page.waitForTimeout(3000);
      }
    } catch {}

    // Remove any previously uploaded (failed) AAB
    try {
      var removeButtons = await page.locator('button[aria-label*="Remove"], button:has-text("close"), [aria-label*="remove"]').all();
      for (var rb = 0; rb < removeButtons.length; rb++) {
        try { await removeButtons[rb].click({ timeout: 2000 }); await page.waitForTimeout(1000); } catch {}
      }
      // Also click X buttons next to AAB entries
      var xButtons = await page.locator('.aab-entry button, [class*="remove"] button').all();
      // Try clicking any visible X near the aab filename
      await page.evaluate(function() {
        document.querySelectorAll('button').forEach(function(b) {
          if (b.textContent.trim() === 'close' || b.getAttribute('aria-label') === 'Remove') {
            b.click();
          }
        });
      });
      await page.waitForTimeout(2000);
    } catch {}

    await page.screenshot({ path: path.join(SHOTS, app.key + '_release_02_form.png') }).catch(function(){});

    // Upload AAB - click "Upload" button which triggers file chooser
    log('  Uploading AAB...');
    var uploaded = false;

    // Strategy 1: Click Upload button -> fileChooser
    try {
      var uploadBtns = ['button:has-text("Upload")', '[aria-label*="Upload"]'];
      for (var ub = 0; ub < uploadBtns.length && !uploaded; ub++) {
        try {
          var ubtn = page.locator(uploadBtns[ub]).first();
          if (await ubtn.isVisible({ timeout: 3000 })) {
            var result = await Promise.all([
              page.waitForEvent('filechooser', { timeout: 15000 }),
              ubtn.click(),
            ]);
            await result[0].setFiles(aabPath);
            uploaded = true;
            log('  AAB file selected via fileChooser');
          }
        } catch {}
      }
    } catch {}

    // Strategy 2: Hidden file input
    if (!uploaded) {
      try {
        await page.evaluate(function() {
          document.querySelectorAll('input[type="file"]').forEach(function(el) {
            el.style.display = 'block'; el.style.position = 'fixed';
            el.style.top = '0'; el.style.left = '0';
            el.style.width = '200px'; el.style.height = '50px';
            el.style.zIndex = '99999'; el.style.opacity = '1';
          });
        });
        await page.waitForTimeout(500);
        var fi = page.locator('input[type="file"]').first();
        if (await fi.count() > 0) {
          await fi.setInputFiles(aabPath);
          uploaded = true;
          log('  AAB file set via input');
        }
      } catch {}
    }

    if (!uploaded) {
      log('  FAILED to upload AAB');
      await page.screenshot({ path: path.join(SHOTS, app.key + '_release_upload_fail.png') }).catch(function(){});
      continue;
    }

    // Wait for AAB processing (can take 1-2 minutes)
    log('  Waiting for AAB processing...');
    for (var w = 0; w < 24; w++) {
      await page.waitForTimeout(5000);
      var still = await page.evaluate(function() {
        var t = document.body.innerText;
        return t.indexOf('processing') >= 0 || t.indexOf('Uploading') >= 0 || t.indexOf('optimized') >= 0;
      });
      if (!still) { log('  AAB processed'); break; }
      if (w === 23) log('  AAB still processing, continuing...');
    }

    await page.screenshot({ path: path.join(SHOTS, app.key + '_release_03_uploaded.png') }).catch(function(){});

    // Check for errors (e.g. "signed in debug mode")
    var hasError = await page.evaluate(function() {
      return document.body.innerText.indexOf('debug mode') >= 0 || 
             document.body.innerText.indexOf('Upload failed') >= 0;
    });
    if (hasError) {
      log('  ERROR: AAB rejected (check screenshot)');
      await page.screenshot({ path: path.join(SHOTS, app.key + '_release_error.png'), fullPage: true }).catch(function(){});
      continue;
    }

    // Fill release name
    try {
      var rnInput = page.locator('input[aria-label*="Release name"], input[aria-label*="release name"]').first();
      if (await rnInput.isVisible({ timeout: 3000 })) {
        await rnInput.click();
        await rnInput.fill('1.0.0');
        log('  Release name: 1.0.0');
      }
    } catch {}

    // Fill release notes with proper language tags
    await page.evaluate(function() { window.scrollTo(0, document.body.scrollHeight); });
    await page.waitForTimeout(1000);

    // Click "Add release notes" or find the textarea
    try {
      var addNotesBtn = page.locator('button:has-text("Add release notes"), a:has-text("Add release notes")').first();
      if (await addNotesBtn.isVisible({ timeout: 2000 })) {
        await addNotesBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch {}
    
    try {
      var notesArea = page.locator('textarea').first();
      if (await notesArea.isVisible({ timeout: 3000 })) {
        await notesArea.click();
        await notesArea.fill('<en-US>\nInitial release\n</en-US>');
        log('  Release notes set');
      }
    } catch {}

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SHOTS, app.key + '_release_04_filled.png'), fullPage: true }).catch(function(){});

    // Click "Next" to go to preview
    if (await page.locator('button:has-text("Next")').first().isVisible({ timeout: 3000 }).catch(function(){ return false; })) {
      await page.locator('button:has-text("Next")').first().click();
      await page.waitForTimeout(5000);
      log('  Moved to preview');
      await page.screenshot({ path: path.join(SHOTS, app.key + '_release_05_preview.png'), fullPage: true }).catch(function(){});
    }

    // Start rollout to internal testing
    var rolloutClicked = false;
    for (var rt of ['Start rollout to Internal testing', 'Start rollout', 'Rollout']) {
      try {
        var rb = page.locator('button:has-text("' + rt + '")').first();
        if (await rb.isVisible({ timeout: 3000 })) {
          await rb.click();
          rolloutClicked = true;
          log('  Clicked: ' + rt);
          await page.waitForTimeout(3000);
          break;
        }
      } catch {}
    }

    // Confirm dialog
    if (rolloutClicked) {
      try {
        var confirmBtn = page.locator('button:has-text("Rollout")').last();
        if (await confirmBtn.isVisible({ timeout: 3000 })) {
          await confirmBtn.click();
          await page.waitForTimeout(5000);
          log('  Rollout confirmed!');
        }
      } catch {}
    }

    await page.screenshot({ path: path.join(SHOTS, app.key + '_release_06_done.png'), fullPage: true }).catch(function(){});
    log('  === ' + app.key + ' release complete ===');
  }

  log('\nDone!');
  await context.close();
})();
