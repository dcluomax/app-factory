const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
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

    await page.goto(BASE + '/app/' + app.id + '/tracks/internal-testing', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // Click the Testers TAB specifically (it's inside a tab bar, after "Releases")
    var clicked = await page.evaluate(function() {
      // Find all elements with role="tab" 
      var tabs = document.querySelectorAll('[role="tab"]');
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].textContent.trim() === 'Testers') {
          tabs[i].click();
          return true;
        }
      }
      // Fallback: find tab links
      var links = document.querySelectorAll('a, button');
      for (var j = 0; j < links.length; j++) {
        var el = links[j];
        // Must be inside the tab bar area (between Releases tab and content)
        if (el.textContent.trim() === 'Testers' && el.getBoundingClientRect().y > 400 && el.getBoundingClientRect().y < 500) {
          el.click();
          return true;
        }
      }
      return false;
    });
    log('  Testers tab clicked: ' + clicked);
    await page.waitForTimeout(5000);

    // Verify we're on the testers section (should see "List name" and checkboxes)
    var onTestersTab = await page.evaluate(function() {
      return document.body.innerText.indexOf('List name') >= 0;
    });
    
    if (!onTestersTab) {
      // Try clicking by position - the Testers tab is right after Releases tab
      log('  Not on testers tab, trying Playwright click...');
      // Find the second tab (Testers is the 2nd tab after Releases)
      try {
        var allTabs = await page.locator('[role="tab"]').all();
        log('  Found ' + allTabs.length + ' tabs');
        if (allTabs.length >= 2) {
          await allTabs[1].click();
          await page.waitForTimeout(5000);
          log('  Clicked 2nd tab');
        }
      } catch {}
    }

    await page.screenshot({ path: path.join(SHOTS, app.key + '_fix_testers_01.png') }).catch(function(){});

    // Now check the checkbox for "testers" list
    var cbResult = await page.evaluate(function() {
      // Find ALL checkboxes on the page
      var allCb = document.querySelectorAll('material-checkbox, [role="checkbox"]');
      var results = [];
      allCb.forEach(function(cb, idx) {
        var row = cb.closest('tr') || cb.closest('[class*="row"]') || cb.parentElement;
        var rowText = row ? row.textContent.trim().substring(0, 50) : '';
        var input = cb.querySelector('input[type="checkbox"]');
        var isChecked = input ? input.checked : (cb.getAttribute('aria-checked') === 'true');
        results.push({ idx: idx, text: rowText, checked: isChecked });
        
        // Click if near "testers" text and not checked
        if (rowText.indexOf('testers') >= 0 && !isChecked) {
          cb.click();
          results[results.length - 1].action = 'CLICKED';
        }
      });
      return results;
    });
    
    log('  Checkboxes:');
    cbResult.forEach(function(cb) { log('    #' + cb.idx + ': "' + cb.text.substring(0, 40) + '" checked=' + cb.checked + (cb.action ? ' ' + cb.action : '')); });

    await page.waitForTimeout(2000);

    // Save
    try {
      var saveBtn = page.locator('button:has-text("Save")').first();
      if (await saveBtn.isEnabled({ timeout: 3000 })) {
        await saveBtn.click();
        await page.waitForTimeout(5000);
        log('  SAVED!');
      } else {
        log('  Save not enabled');
      }
    } catch {}

    await page.screenshot({ path: path.join(SHOTS, app.key + '_fix_testers_02.png'), fullPage: true }).catch(function(){});
  }

  log('\nDone!');
  await context.close();
})();
