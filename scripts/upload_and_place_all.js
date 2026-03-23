const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const PROFILE = path.join(os.homedir(), 'ChromePlayConsole');
const BASE = 'https://play.google.com/console/u/0/developers/process.env.DEVELOPER_ID || 'YOUR_DEVELOPER_ID'';
const SHOTS = path.join(__dirname, 'screenshots');
const ASSETS = path.join(__dirname, 'assets');

const APPS = [
  { key: 'focusforge', id: 'process.env.FOCUSFORGE_ID || 'FOCUSFORGE_APP_ID'' },
  { key: 'quickshrink', id: 'process.env.QUICKSHRINK_ID || 'QUICKSHRINK_APP_ID'' },
  { key: 'pixelstrip', id: 'process.env.PIXELSTRIP_ID || 'PIXELSTRIP_APP_ID'' },
  { key: 'typefast', id: 'process.env.TYPEFAST_ID || 'TYPEFAST_APP_ID'' },
  { key: 'noiselog', id: 'process.env.NOISELOG_ID || 'NOISELOG_APP_ID'' },
];

function log(msg) { console.log('[' + new Date().toISOString().slice(11,19) + '] ' + msg); }

// Upload file to library via hidden input
async function uploadToLibrary(page, sectionIdx, filePaths) {
  var btns = await page.locator('button[debug-id="add-button"]').all();
  if (sectionIdx >= btns.length) return false;
  await btns[sectionIdx].scrollIntoViewIfNeeded();
  await btns[sectionIdx].click();
  await page.waitForTimeout(2000);
  
  var ok = await page.evaluate(function() {
    var input = document.querySelector('simple-uploader input[type="file"], input[type="file"][accept*=".png"]');
    if (input) {
      input.style.display = 'block'; input.style.position = 'fixed';
      input.style.top = '0'; input.style.left = '0';
      input.style.width = '200px'; input.style.height = '50px';
      input.style.zIndex = '99999'; input.style.opacity = '1';
      return true;
    }
    return false;
  });
  if (!ok) return false;
  
  var fileInput = page.locator('simple-uploader input[type="file"], input[type="file"][accept*=".png"]').first();
  await fileInput.setInputFiles(filePaths);
  await page.waitForTimeout(8000);
  return true;
}

// Place image from library into section
async function placeFromLibrary(page, sectionIdx, imgName) {
  var btns = await page.locator('button[debug-id="add-button"]').all();
  if (sectionIdx >= btns.length) return false;
  await btns[sectionIdx].scrollIntoViewIfNeeded();
  await btns[sectionIdx].click();
  await page.waitForTimeout(2000);
  
  // Click arrow_right_alt on the image to open detail
  var found = await page.evaluate(function(name) {
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].childNodes.length <= 3 && all[i].textContent.trim() === name) {
        var container = all[i].closest('[class*="item"]') || all[i].parentElement.parentElement;
        if (container) {
          var bs = container.querySelectorAll('button');
          for (var j = 0; j < bs.length; j++) {
            if (bs[j].textContent.indexOf('arrow_right') >= 0) { bs[j].click(); return true; }
          }
        }
      }
    }
    return false;
  }, imgName);
  if (!found) return false;
  
  await page.waitForTimeout(2000);
  
  // Click "Add" button
  try {
    var addBtn = page.locator('button:has-text("Add")').last();
    if (await addBtn.isVisible({ timeout: 3000 })) {
      await addBtn.click();
      await page.waitForTimeout(3000);
      return true;
    }
  } catch {}
  return false;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  var context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome', headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--disable-extensions'],
    viewport: { width: 1440, height: 900 }, timeout: 60000,
  });
  var page = context.pages()[0] || await context.newPage();

  var filterApp = process.argv[2];
  var appsToProcess = filterApp ? APPS.filter(function(a) { return a.key === filterApp; }) : APPS;

  for (var ai = 0; ai < appsToProcess.length; ai++) {
    var app = appsToProcess[ai];
    log('\n=== ' + app.key + ' ===');
    
    await page.goto(BASE + '/app/' + app.id + '/main-store-listing', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(8000);
    
    var iconPath = path.join(ASSETS, app.key + '_icon_512.png');
    var fgPath = path.join(__dirname, 'fg_' + app.key + '.png');
    var s1 = path.join(ASSETS, app.key + '_screen_1.png');
    var s2 = path.join(ASSETS, app.key + '_screen_2.png');
    
    // Upload all images to library (section 0 trigger is enough - they all go to same library)
    log('  Uploading to library...');
    if (fs.existsSync(iconPath)) await uploadToLibrary(page, 0, iconPath);
    if (fs.existsSync(fgPath)) await uploadToLibrary(page, 0, fgPath);
    if (fs.existsSync(s1)) await uploadToLibrary(page, 0, s1);
    if (fs.existsSync(s2)) await uploadToLibrary(page, 0, s2);
    log('  Library uploads done');
    
    // Place images from library into sections
    // 0=Icon, 1=Feature graphic, 2=Phone screenshots
    log('  Placing images...');
    
    // Screenshots (section 2) - do first since they need 2 images
    if (fs.existsSync(s1)) {
      var ok1 = await placeFromLibrary(page, 2, app.key + '_screen_1.png');
      log(ok1 ? '  + screen_1 placed' : '  ~ screen_1 failed');
    }
    if (fs.existsSync(s2)) {
      var ok2 = await placeFromLibrary(page, 2, app.key + '_screen_2.png');
      log(ok2 ? '  + screen_2 placed' : '  ~ screen_2 failed');
    }
    
    // Icon (section 0)
    if (fs.existsSync(iconPath)) {
      var okI = await placeFromLibrary(page, 0, app.key + '_icon_512.png');
      log(okI ? '  + icon placed' : '  ~ icon failed');
    }
    
    // Feature graphic (section 1)
    if (fs.existsSync(fgPath)) {
      var okF = await placeFromLibrary(page, 1, 'fg_' + app.key + '.png');
      log(okF ? '  + feature graphic placed' : '  ~ feature graphic failed');
    }
    
    // Save
    await page.waitForTimeout(2000);
    try {
      var saveBtn = page.locator('button:has-text("Save")').last();
      if (await saveBtn.isVisible({ timeout: 3000 })) {
        await saveBtn.click();
        await page.waitForTimeout(5000);
        log('  + SAVED');
      }
    } catch {}
  }
  
  log('\n=== ALL DONE ===');
  await context.close();
})();
