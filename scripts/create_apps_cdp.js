const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const APPS = [
  { name: 'FocusForge - Focus Timer', pkg: 'com.orthogonal.focusforge' },
  { name: 'QuickShrink - Image Compress', pkg: 'com.orthogonal.quickshrink' },
  { name: 'PixelStrip - EXIF Remover', pkg: 'com.orthogonal.pixelstrip' },
  { name: 'TypeFast - Text Expander', pkg: 'com.orthogonal.typefast' },
  { name: 'NoiseLog - Sound Meter', pkg: 'com.orthogonal.noiselog' },
];

const SHOTS = __dirname;
const PROFILE = path.join(os.homedir(), 'ChromePlayConsole');
const CONSOLE_URL = 'https://play.google.com/console/u/0/developers/process.env.DEVELOPER_ID || 'YOUR_DEVELOPER_ID'/app-list';

async function shot(page, name) {
  try { await page.screenshot({ path: path.join(SHOTS, name), fullPage: true, timeout: 15000 }); }
  catch (e) {}
}

(async () => {
  console.log('=== Launching Chrome ===');
  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome', headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--disable-extensions'],
    viewport: { width: 1400, height: 900 }, timeout: 60000,
  });
  const page = context.pages()[0] || await context.newPage();

  for (let i = 0; i < APPS.length; i++) {
    const app = APPS[i];
    console.log('\n--- [' + (i+1) + '/5] ' + app.name + ' ---');

    try {
      // Navigate to create-new-app directly
      await page.goto('https://play.google.com/console/u/0/developers/process.env.DEVELOPER_ID || 'YOUR_DEVELOPER_ID'/create-new-app', 
        { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);

      // 1. Fill name using Playwright (more reliable than JS)
      const nameInput = page.locator('input[aria-label="App name"]');
      await nameInput.click();
      await nameInput.fill(app.name);
      console.log('  ✓ Name: ' + app.name);

      // 2. Select "App" radio via JS click on material-radio
      await page.evaluate(() => {
        const groups = document.querySelectorAll('material-radio-group');
        if (groups[0]) groups[0].querySelector('material-radio')?.click(); // App
        if (groups[1]) groups[1].querySelector('material-radio')?.click(); // Free
      });
      console.log('  ✓ App + Free selected');

      // 3. Scroll down to see declarations
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      // 4. Ensure checkboxes are CHECKED (not toggled)
      await page.evaluate(() => {
        document.querySelectorAll('material-checkbox').forEach(cb => {
          const input = cb.querySelector('input[type="checkbox"]');
          if (input && !input.checked) {
            cb.click();
          }
        });
      });
      console.log('  ✓ Declarations checked');

      await page.waitForTimeout(500);
      await shot(page, 'create_' + (i+1) + '_ready.png');

      // 5. Click "Create app" button - scroll it into view first
      const createBtn = page.locator('button:has-text("Create app")').last();
      await createBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      const isEnabled = await createBtn.isEnabled({ timeout: 2000 }).catch(() => false);
      console.log('  Create button enabled:', isEnabled);
      
      if (isEnabled) {
        await createBtn.click();
        // Wait for navigation away from create page
        try {
          await page.waitForURL(url => !url.toString().includes('create-new-app'), { timeout: 15000 });
          console.log('  ✅ Created! → ' + page.url().split('/').slice(-2).join('/'));
        } catch(e) {
          // Check for error message
          const error = await page.locator('text=couldn\'t be created').isVisible({ timeout: 1000 }).catch(() => false);
          if (error) {
            console.log('  ❌ "App couldn\'t be created" error');
            await shot(page, 'create_' + (i+1) + '_fail.png');
          } else {
            await page.waitForTimeout(3000);
            if (!page.url().includes('create-new-app')) {
              console.log('  ✅ Created (slow redirect)');
            } else {
              console.log('  ⚠️ Unknown state');
              await shot(page, 'create_' + (i+1) + '_unknown.png');
            }
          }
        }
      } else {
        console.log('  ❌ Button disabled — checking what\'s missing...');
        await shot(page, 'create_' + (i+1) + '_disabled.png');
      }

    } catch (err) {
      console.log('  ❌ ' + err.message.substring(0, 120));
      await shot(page, 'create_' + (i+1) + '_error.png');
    }
  }

  // Final check
  console.log('\n=== Verifying app list ===');
  await page.goto(CONSOLE_URL, { timeout: 30000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await shot(page, 'final_applist.png');
  
  const appNames = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => 
      r.querySelector('td')?.textContent?.trim().substring(0, 40)
    );
  });
  console.log('Apps:', appNames.length ? appNames.join(', ') : '(none found in table)');

  await context.close();
})();
