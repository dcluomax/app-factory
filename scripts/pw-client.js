/**
 * Playwright HTTP API Client
 * 
 * Replaces local Playwright with remote HTTP calls to pw-server.
 * Server: http://192.168.0.62:3900 (persistent Chrome profile)
 * FlareSolverr: http://192.168.0.62:30099 (Cloudflare bypass)
 * 
 * Usage:
 *   const pw = require('./pw-client');
 *   await pw.navigate('https://play.google.com/console');
 *   await pw.click({ text: 'Create app' });
 *   await pw.fill({ selector: 'input[aria-label="App name"]', value: 'My App' });
 *   var html = await pw.getHtml();
 *   await pw.screenshot('/tmp/screenshot.png');
 */

const http = require('http');
const fs = require('fs');

const PW_API = process.env.PW_API || 'http://192.168.0.62:3900';
const FLARESOLVERR = process.env.FLARESOLVERR || 'http://192.168.0.62:30099';

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, PW_API);
    const body = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); }
        catch { resolve({ ok: false, error: chunks }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, PW_API);
    http.get(url, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.headers['content-type'] && res.headers['content-type'].includes('image')) {
          resolve(buf);
        } else {
          try { resolve(JSON.parse(buf.toString())); }
          catch { resolve(buf.toString()); }
        }
      });
    }).on('error', reject);
  });
}

module.exports = {
  /** Check if server is running */
  health: () => get('/health'),

  /** Navigate to URL */
  navigate: (url, waitFor) => post('/navigate', { url, waitFor: waitFor || 'domcontentloaded' }),

  /** Click element by CSS selector or text */
  click: (opts) => post('/click', opts),

  /** Fill input by selector */
  fill: (opts) => post('/fill', opts),

  /** Execute JavaScript in page context */
  evaluate: (script) => post('/evaluate', { script }),

  /** Get screenshot as Buffer (save with fs.writeFileSync) */
  screenshot: async (savePath) => {
    const buf = await get('/screenshot');
    if (savePath) fs.writeFileSync(savePath, buf);
    return buf;
  },

  /** Get cookies */
  cookies: () => get('/cookies'),

  /** Fetch URL via FlareSolverr (bypasses Cloudflare) */
  flareGet: (url) => post('/v1', { cmd: 'request.get', url, maxTimeout: 30000 }),

  /** Wait (convenience) */
  wait: (ms) => new Promise(r => setTimeout(r, ms || 3000)),
};
