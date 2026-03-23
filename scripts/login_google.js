const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const PROFILE = path.join(os.homedir(), 'ChromePlayConsole');

(async () => {
  console.log('=== Opening Chrome for Google login ===');
  console.log('Profile:', PROFILE);
  console.log('(Login will persist for future runs)\n');

  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome',
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
    ],
    viewport: null,
    timeout: 60000,
  });

  const page = context.pages()[0] || await context.newPage();

  // Navigate to Google sign-in
  await page.goto('https://accounts.google.com', { timeout: 30000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  if (url.includes('myaccount.google.com') || url.includes('SignOutOptions')) {
    console.log('✅ Already logged in! URL:', url);
    console.log('\nClosing browser (session saved)...');
    await context.close();
    return;
  }

  console.log('📋 Please log into Google in the Chrome window.');
  console.log('   Waiting up to 10 minutes...\n');

  // Wait until user completes login (URL changes away from sign-in)
  try {
    await page.waitForURL(url => {
      const u = url.toString();
      return u.includes('myaccount.google.com') || 
             (u.includes('google.com') && !u.includes('accounts.google.com/v3/signin') && 
              !u.includes('/ServiceLogin') && !u.includes('/identifier'));
    }, { timeout: 600000 });

    console.log('✅ Login successful! URL:', page.url());
  } catch (e) {
    console.log('⏰ Timeout waiting for login.');
  }

  // Verify by visiting Play Console
  console.log('\nVerifying Play Console access...');
  await page.goto('https://play.google.com/console/developers', { timeout: 30000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  console.log('Play Console URL:', page.url());

  if (page.url().includes('/console/') && !page.url().includes('/about')) {
    console.log('✅ Play Console accessible! Ready for automation.');
  } else {
    console.log('⚠️ Play Console shows:', page.url());
    console.log('   (This is OK - you may need to accept developer terms)');
  }

  console.log('\nClosing browser (session saved to', PROFILE, ')');
  await context.close();
  console.log('Done! Run create_apps_cdp.js next.');
})();
