#!/usr/bin/env node
/**
 * Example: Using pw-client.js instead of local Playwright
 * 
 * BEFORE (requires local Chrome + Playwright):
 *   const { chromium } = require('playwright');
 *   const context = await chromium.launchPersistentContext('~/ChromePlayConsole', {...});
 *   const page = context.pages()[0];
 *   await page.goto('https://play.google.com/console');
 *   await page.click('button:has-text("Create app")');
 * 
 * AFTER (HTTP API, runs anywhere):
 *   const pw = require('./pw-client');
 *   await pw.navigate('https://play.google.com/console');
 *   await pw.click({ text: 'Create app' });
 */

const pw = require('./pw-client');

(async () => {
  // Health check
  console.log('Server:', await pw.health());

  // Navigate
  var result = await pw.navigate('https://orthogonal.info/');
  console.log('Title:', result.title);

  // Screenshot
  await pw.screenshot('/tmp/pw-test.png');
  console.log('Screenshot saved');

  // Evaluate JS in page
  var links = await pw.evaluate('() => document.querySelectorAll("a").length');
  console.log('Links on page:', links.result);
})();
