import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/baustellen-qa/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const url = 'http://127.0.0.1:5173/baustellenbegehung-app/';
const saved = p => p.getByRole('status').filter({ hasText: 'Auf diesem Gerät gespeichert' }).waitFor();
try {
  for (const mode of ['getter', 'read', 'quota', 'both']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(mode => {
      if (mode === 'getter' || mode === 'both') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
      if (mode === 'read') {
        localStorage.setItem('app.ccEmail', 'unread@example.invalid');
        const originalRead = Storage.prototype.getItem;
        window.__qaReadPreference = key => originalRead.call(localStorage, key);
        Storage.prototype.getItem = () => { throw new DOMException('blocked', 'SecurityError'); };
      }
      if (mode === 'quota') Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
      if (mode === 'both') Object.defineProperty(window, 'indexedDB', { value: { open() { throw new Error('IndexedDB gesperrt'); } } });
    }, mode);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.getByRole('alert').filter({ hasText: 'Voreinstellungen konnten nicht' }).waitFor();
    if (mode === 'both') {
      await page.getByRole('alert').filter({ hasText: 'IndexedDB gesperrt' }).waitFor();
      assert.equal(await page.getByPlaceholder('z.B. Schleusenmodernisierung XY').isDisabled(), true);
    } else {
      await saved(page);
      if (mode === 'read') assert.equal(await page.evaluate(() => window.__qaReadPreference('app.ccEmail')), 'unread@example.invalid');
      await page.getByPlaceholder('z.B. Schleusenmodernisierung XY').fill(`Projekt ${mode}`);
      await page.getByPlaceholder('z.B. joachim@firma.de').fill('qa@example.invalid');
      await page.locator('select').selectOption('custom');
      await saved(page);
      await page.reload(); await saved(page);
      assert.equal(await page.getByPlaceholder('z.B. Schleusenmodernisierung XY').inputValue(), `Projekt ${mode}`);
      assert.equal(await page.getByPlaceholder('z.B. joachim@firma.de').inputValue(), 'qa@example.invalid');
      assert.equal(await page.locator('select').inputValue(), 'custom');
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${mode} — visible warning, no uncaught errors, ${mode === 'both' ? 'draft error visible and editing blocked' : 'IndexedDB recovery intact'}`);
    await context.close();
  }
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('app.ccEmail', 'legacy@example.invalid');
    localStorage.setItem('app.logoChoice', 'hagn');
    localStorage.setItem('app.logoSrc', '/baustellenbegehung-app/hagn-logo.png');
    localStorage.setItem('untouched-test-key', 'retain');
  });
  const page = await context.newPage(); await page.goto(url); await saved(page);
  assert.equal(await page.getByPlaceholder('z.B. joachim@firma.de').inputValue(), 'legacy@example.invalid');
  assert.equal(await page.locator('select').inputValue(), 'hagn');
  assert.equal(await page.evaluate(() => localStorage.getItem('app.ccEmail')), 'legacy@example.invalid');
  assert.equal(await page.evaluate(() => localStorage.getItem('untouched-test-key')), 'retain');
  console.log('PASS: existing raw-string preferences imported, format and unrelated storage preserved');
  await context.close();
} finally { await browser.close(); }
