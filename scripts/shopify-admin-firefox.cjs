const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { firefox } = require('playwright');

const TASK = process.env.SHOPIFY_ADMIN_TASK || 'status';
const STORE_HANDLE = process.env.SHOPIFY_ADMIN_STORE_HANDLE || 'rolangbeauty';
const FIREFOX_EXECUTABLE = process.env.FIREFOX_EXECUTABLE || '';
const FIREFOX_PROFILE =
  process.env.FIREFOX_PROFILE ||
  path.join(os.homedir(), 'Library/Application Support/Firefox/Profiles/qwwzg93g.default-release');
const CAMBODIA_SHIPPING_RATE = process.env.CAMBODIA_SHIPPING_RATE_MYR || '12.00';
const REPORT_PATH =
  process.env.SHOPIFY_LIVE_REPORT_PATH ||
  path.join(__dirname, '..', 'shopify-import', 'rolang-live-catalog-report.json');
const ARTIFACT_DIR = path.join(__dirname, '..', '.autopilot', 'firefox-admin');

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function numericId(gid) {
  return String(gid).split('/').pop();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeTaskOutput(summary) {
  const outputPath = path.join(ARTIFACT_DIR, `${TASK}-latest.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

function loadReport() {
  return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
}

function selectItems(items) {
  const filterTokens = (process.env.SHOPIFY_ADMIN_FILTER || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const limit = Number(process.env.SHOPIFY_ADMIN_LIMIT || '0');

  let selected = items;

  if (filterTokens.length > 0) {
    selected = selected.filter((item) =>
      filterTokens.some((token) => JSON.stringify(item).toLowerCase().includes(token)),
    );
  }

  if (Number.isFinite(limit) && limit > 0) {
    selected = selected.slice(0, limit);
  }

  return selected;
}

function cloneFirefoxProfile() {
  const targetDir = path.join(ARTIFACT_DIR, `profile-${Date.now()}`);
  fs.rmSync(targetDir, { force: true, recursive: true });
  fs.cpSync(FIREFOX_PROFILE, targetDir, { recursive: true });

  for (const lockFile of ['parent.lock', '.parentlock', 'lock']) {
    fs.rmSync(path.join(targetDir, lockFile), { force: true });
  }

  return targetDir;
}

function loadFirefoxCookies(profileDir) {
  const databasePath = path.join(profileDir, 'cookies.sqlite');
  const query = [
    'SELECT host, path, isSecure, expiry, name, value, isHttpOnly',
    'FROM moz_cookies',
    "WHERE host LIKE '%shopify.com%' OR host LIKE '%myshopify.com%'",
  ].join(' ');

  const raw = execFileSync('sqlite3', ['-separator', '\t', databasePath, query], {
    encoding: 'utf8',
  }).trim();

  if (!raw) {
    return [];
  }

  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [domain, cookiePath, secure, expires, name, value, httpOnly] = line.split('\t');
      const rawExpires = Number(expires);
      const normalizedExpires = rawExpires > 10_000_000_000 ? Math.floor(rawExpires / 1000) : rawExpires;
      return {
        name,
        value,
        domain,
        path: cookiePath || '/',
        expires: normalizedExpires > 0 ? normalizedExpires : -1,
        httpOnly: httpOnly === '1',
        secure: secure === '1',
      };
    });
}

async function launchAdminContext() {
  const userDataDir = cloneFirefoxProfile();
  console.log(`Cloned Firefox profile to ${userDataDir}`);
  const launchOptions = {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  };

  if (FIREFOX_EXECUTABLE) {
    launchOptions.executablePath = FIREFOX_EXECUTABLE;
  }

  const browser = await firefox.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    locale: 'en-US',
  });
  const cookies = loadFirefoxCookies(userDataDir);
  console.log(`Imported ${cookies.length} Shopify cookies from Firefox profile`);

  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }

  console.log(`Firefox context launched${FIREFOX_EXECUTABLE ? ' with custom executable' : ''}`);

  return { browser, context, userDataDir };
}

async function closeAdminContext(browser, context, userDataDir) {
  await context.close();
  await browser.close();
  fs.rmSync(userDataDir, { force: true, recursive: true });
}

async function gotoAdmin(page, suffix) {
  const url = `https://admin.shopify.com/store/${STORE_HANDLE}${suffix}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    console.log(`Opening admin route: ${suffix} (attempt ${attempt})`);

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      console.log(`Loaded admin route: ${suffix}`);
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }

      await wait(1200);
    }
  }
}

async function ensureLoggedIn(page) {
  console.log(`Checking admin session at ${page.url()}`);
  if (page.url().includes('/auth/login') || page.url().includes('/account/login')) {
    throw new Error(`Firefox admin profile is not logged in: ${page.url()}`);
  }

  const bodyText = await page.locator('body').innerText();
  if (/Log in|Sign in to Shopify/i.test(bodyText.slice(0, 1200))) {
    throw new Error(`Firefox admin profile is not logged in: ${page.url()}`);
  }
}

async function savePage(page) {
  const saveButton = page.getByRole('button', { name: /^Save$/ }).last();
  if ((await saveButton.count()) === 0) {
    return;
  }

  if (await saveButton.isDisabled()) {
    return;
  }

  await page.locator('.Polaris-Backdrop').waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
  try {
    await saveButton.click();
  } catch {
    await saveButton.click({ force: true });
  }
  await Promise.race([
    saveButton.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {}),
    page.getByText(/Saved/i).first().waitFor({ timeout: 15000 }).catch(() => {}),
    page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}),
  ]);
  await wait(800);
}

async function includeInOnlineStore(page) {
  const bodyText = await page.locator('body').innerText();
  if (!/Not included in any sales channels/i.test(bodyText)) {
    return { changed: false, reason: 'already_in_sales_channels' };
  }

  const managePublishing = page.getByRole('button', { name: /Manage publishing/i });
  if ((await managePublishing.count()) === 0) {
    return { changed: false, reason: 'manage_publishing_not_found' };
  }

  await managePublishing.click();

  const dialog = page.getByRole('dialog', { name: /Manage publishing/i });
  await dialog.waitFor({ state: 'visible', timeout: 15000 });

  const searchInput = dialog
    .locator('input[placeholder="Search channels"], s-internal-search-field input')
    .first();
  if ((await searchInput.count()) > 0) {
    await searchInput.click({ force: true });
    await searchInput.fill('Online Store');
    await wait(1200);
  }

  const onlineStoreText = dialog.getByText(/Online Store/i).last();
  if ((await onlineStoreText.count()) > 0) {
    const onlineStoreCheckbox = onlineStoreText
      .locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]')
      .locator('input[type="checkbox"]')
      .first();

    if ((await onlineStoreCheckbox.count()) > 0) {
      if (!(await onlineStoreCheckbox.isChecked())) {
        await onlineStoreCheckbox.check({ force: true });
      }
    } else {
      await onlineStoreText.click({ force: true });
    }
  } else {
    let checkboxes = dialog.locator('input[type="checkbox"]');
    let checkboxCount = await checkboxes.count();

    if (checkboxCount === 0) {
      await wait(2000);
      checkboxes = dialog.locator('input[type="checkbox"]');
      checkboxCount = await checkboxes.count();
    }

    if (checkboxCount > 0) {
      const onlineStoreCheckbox = checkboxes.first();
      if (!(await onlineStoreCheckbox.isChecked())) {
        await onlineStoreCheckbox.check({ force: true });
      }
    } else {
      throw new Error('Publishing dialog opened, but no sales channel checkbox was found.');
    }
  }

  await dialog.getByRole('button', { name: /^Done$/ }).click();
  await savePage(page);

  const afterText = await page.locator('body').innerText();
  if (/Not included in any sales channels/i.test(afterText)) {
    return { changed: false, reason: 'save_did_not_publish' };
  }

  return { changed: true, reason: 'published' };
}

async function runPublishTask(page, items, resourceType, routePrefix) {
  const summary = {
    task: TASK,
    resourceType,
    total: items.length,
    changed: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  for (const item of items) {
    const numeric = numericId(item.id);
    const label = item.title || item.handle || numeric;
    const url = `${routePrefix}/${numeric}`;

    try {
      await gotoAdmin(page, url);
      await ensureLoggedIn(page);
      const result = await includeInOnlineStore(page);
      console.log(`[${resourceType}] ${label}: ${result.reason}`);
      summary.results.push({
        id: numeric,
        title: label,
        status: result.reason,
      });

      if (result.changed) {
        summary.changed += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.log(
        `[${resourceType}] ${label}: failed - ${error instanceof Error ? error.message : String(error)}`,
      );
      const screenshotPath = path.join(
        ARTIFACT_DIR,
        `${resourceType}-${numeric}-${Date.now()}.png`,
      );
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      summary.results.push({
        id: numeric,
        title: label,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        screenshotPath,
      });
    }
  }

  writeTaskOutput(summary);
}

async function runBulkCollectionPublish(page, items) {
  const summary = {
    task: TASK,
    resourceType: 'collection',
    total: items.length,
    changed: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  await gotoAdmin(page, '/collections');
  await ensureLoggedIn(page);

  for (const item of items) {
    const numeric = numericId(item.id);
    const checkbox = page.locator(`input[id="Select-gid://shopify/Collection/${numeric}"]`);

    try {
      if ((await checkbox.count()) === 0) {
        throw new Error('Collection row checkbox not found on the collections list page.');
      }

      await checkbox.check({ force: true });
      summary.results.push({
        id: numeric,
        title: item.title,
        status: 'selected',
      });
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        id: numeric,
        title: item.title,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (summary.failed > 0) {
    writeTaskOutput(summary);
    return;
  }

  const includeButton = page.getByRole('button', { name: /Include in sales channels/i }).first();
  await includeButton.click();

  const dialog = page.locator('dialog[open]').last();
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
  await wait(1200);

  const allCheckboxes = page.locator('input[type="checkbox"]');
  const checkboxCount = await allCheckboxes.count();
  console.log(`[collection] bulk include checkbox count: ${checkboxCount}`);
  if (checkboxCount < 2) {
    throw new Error('Online Store publication checkbox not found in the collections bulk include dialog.');
  }

  const onlineStoreCheckbox = allCheckboxes.nth(checkboxCount - 2);

  if (!(await onlineStoreCheckbox.first().isChecked())) {
    await onlineStoreCheckbox.first().check({ force: true });
  }

  let includeCollectionsButton = page.getByText(/Include collections/i).last();
  if ((await includeCollectionsButton.count()) === 0) {
    includeCollectionsButton = page.locator('s-button').last();
  }
  await includeCollectionsButton.click({ force: true });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await wait(2000);

  summary.changed = items.length;
  summary.results = summary.results.map((item) => ({ ...item, status: 'published' }));

  writeTaskOutput(summary);
}

async function runStatusTask(page) {
  await gotoAdmin(page, '/products');
  await ensureLoggedIn(page);
  const pageTitle = await page.title();
  writeTaskOutput({
    task: TASK,
    url: page.url(),
    title: pageTitle,
  });
}

async function runEnsureCambodiaMarketTask(page) {
  const summary = {
    task: TASK,
    market: 'Cambodia',
    changed: false,
    status: 'unknown',
    url: '',
  };

  await gotoAdmin(page, '/markets');
  await ensureLoggedIn(page);

  let bodyText = await page.locator('body').innerText();
  if (/Cambodia/i.test(bodyText)) {
    summary.status = 'already_present';
    summary.url = page.url();
    writeTaskOutput(summary);
    return;
  }

  const createMarketButton = page.getByText(/^Create market$/).last();
  if ((await createMarketButton.count()) === 0) {
    throw new Error('Create market button not found on Markets page.');
  }

  await createMarketButton.click({ force: true });
  await page.getByText(/New market/i).first().waitFor({ state: 'visible', timeout: 15000 });

  const nameInput = page.locator('input[type="text"], input:not([type])').first();
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  await nameInput.fill('Cambodia');

  const addConditionButton = page.getByRole('button', { name: /Add condition/i }).first();
  await addConditionButton.click();

  const cambodiaCheckbox = page.locator('label[aria-label="Cambodia"] input[type="checkbox"]').first();
  await cambodiaCheckbox.waitFor({ state: 'attached', timeout: 15000 });
  await cambodiaCheckbox.check({ force: true });

  const doneButton = page.getByText(/^Done$/).last();
  await doneButton.click({ force: true });
  await savePage(page);

  bodyText = await page.locator('body').innerText();
  const saveButton = page.getByRole('button', { name: /^Save$/ }).last();
  const saveDisabled = (await saveButton.count()) === 0 ? true : await saveButton.isDisabled().catch(() => false);
  summary.changed = true;
  summary.status = /Cambodia/i.test(bodyText) && (saveDisabled || /Saved/i.test(bodyText)) ? 'created' : 'review_needed';
  summary.url = page.url();
  summary.saveDisabled = saveDisabled;
  summary.unsavedChangesVisible = /Unsaved changes/i.test(bodyText);

  const screenshotPath = path.join(ARTIFACT_DIR, `cambodia-market-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  summary.screenshotPath = screenshotPath;
  writeTaskOutput(summary);
}

async function runInspectShippingTask(page) {
  const summary = {
    task: TASK,
    url: '',
    title: '',
    generalProfileUrl: '',
    containsMalaysia: false,
    containsCambodia: false,
    profileLinks: [],
  };

  await gotoAdmin(page, '/settings/shipping');
  await ensureLoggedIn(page);

  const bodyText = await page.locator('body').innerText();
  const pageTitle = await page.title();
  const profileLinks = await page
    .locator('a[href*="/settings/shipping/profiles/"]')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        href: element.href,
        text: (element.textContent || '').trim(),
      })),
    )
    .catch(() => []);

  summary.url = page.url();
  summary.title = pageTitle;
  summary.profileLinks = profileLinks;
  summary.generalProfileUrl = profileLinks[0]?.href || '';
  summary.containsMalaysia = /Malaysia/i.test(bodyText);
  summary.containsCambodia = /Cambodia/i.test(bodyText);

  const screenshotPath = path.join(ARTIFACT_DIR, `shipping-inspect-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  summary.screenshotPath = screenshotPath;
  writeTaskOutput(summary);
}

async function openShippingProfile(page) {
  await gotoAdmin(page, '/settings/shipping');
  await ensureLoggedIn(page);

  const profileLink = page.locator('a[href*="/settings/shipping/profiles/"]').first();
  if ((await profileLink.count()) === 0) {
    throw new Error('General shipping profile link not found on Shipping and delivery page.');
  }

  const href = await profileLink.getAttribute('href');
  if (!href) {
    throw new Error('General shipping profile href is empty.');
  }

  await page.goto(`https://admin.shopify.com${href}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await ensureLoggedIn(page);
}

async function ensureCambodiaZone(page) {
  const exactCambodia = page.getByText(/^Cambodia$/);
  if ((await exactCambodia.count()) > 0) {
    return { changed: false, status: 'zone_exists' };
  }

  const addZoneButton = page.getByRole('button', { name: /^Add zone$/ }).first();
  if ((await addZoneButton.count()) === 0) {
    throw new Error('Add zone button not found in shipping profile.');
  }

  await addZoneButton.click({ force: true });
  await page.getByText(/Create new shipping zone/i).waitFor({ state: 'visible', timeout: 15000 });

  const zoneNameInput = page.locator('#zone-name-textfield').first();
  await zoneNameInput.waitFor({ state: 'visible', timeout: 15000 });
  await zoneNameInput.fill('Cambodia');

  const cambodiaText = page.getByText(/^Cambodia$/).last();
  const cambodiaCheckbox = cambodiaText
    .locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]')
    .locator('input[type="checkbox"]')
    .first();

  if ((await cambodiaCheckbox.count()) === 0) {
    throw new Error('Cambodia checkbox not found in Add zone flow.');
  }

  if (!(await cambodiaCheckbox.isChecked())) {
    await cambodiaCheckbox.check({ force: true });
  }

  await page.getByText(/^Done$/).last().click({ force: true });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await wait(1200);
  await savePage(page);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await wait(1200);

  if ((await exactCambodia.count()) === 0) {
    throw new Error('Cambodia zone did not appear after saving the shipping profile.');
  }

  return { changed: true, status: 'zone_created' };
}

async function runEnsureCambodiaShippingTask(page) {
  const summary = {
    task: TASK,
    zone: 'Cambodia',
    rateName: 'Standard',
    rateMyr: CAMBODIA_SHIPPING_RATE,
    changed: false,
    status: 'unknown',
    zoneChanged: false,
    shippingOptionChanged: false,
  };

  await openShippingProfile(page);

  let bodyText = (await page.locator('body').innerText()).replace(/\u00a0/g, ' ');
  const exactRatePattern = new RegExp(
    `Cambodia\\s+Standard\\s+RM\\s*${escapeRegExp(CAMBODIA_SHIPPING_RATE)}`,
    'i',
  );
  const anyRatePattern = /Cambodia\s+Standard\s+RM\s*\d+/i;

  if (exactRatePattern.test(bodyText)) {
    summary.status = 'already_configured';
    writeTaskOutput(summary);
    return;
  }

  const zoneResult = await ensureCambodiaZone(page);
  summary.zoneChanged = zoneResult.changed;
  summary.changed = summary.changed || zoneResult.changed;

  bodyText = (await page.locator('body').innerText()).replace(/\u00a0/g, ' ');
  if (anyRatePattern.test(bodyText)) {
    summary.status = 'zone_present_with_existing_rate';
    const screenshotPath = path.join(ARTIFACT_DIR, `cambodia-shipping-existing-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    summary.screenshotPath = screenshotPath;
    writeTaskOutput(summary);
    return;
  }

  const addShippingOptionButton = page.getByRole('button', { name: /Add shipping option/i }).first();
  if ((await addShippingOptionButton.count()) === 0) {
    throw new Error('Add shipping option button for Cambodia zone not found.');
  }

  await addShippingOptionButton.click();
  await page.getByText(/Add shipping option/i).last().waitFor({ state: 'visible', timeout: 15000 });
  await wait(1000);

  const rateNameInput = page.locator('input[role="combobox"]').nth(1);
  const priceInput = page.locator('input[placeholder="0.00"]').first();

  if ((await rateNameInput.count()) === 0 || (await priceInput.count()) === 0) {
    throw new Error('Shipping option inputs were not found after opening the rate drawer.');
  }

  await rateNameInput.fill('Standard');
  await priceInput.fill(CAMBODIA_SHIPPING_RATE);

  await page.getByText(/^Done$/).last().click({ force: true });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await wait(1000);
  await savePage(page);

  bodyText = (await page.locator('body').innerText()).replace(/\u00a0/g, ' ');
  summary.shippingOptionChanged = exactRatePattern.test(bodyText);
  summary.changed = summary.changed || summary.shippingOptionChanged;
  summary.status = summary.shippingOptionChanged ? 'configured' : 'review_needed';

  const screenshotPath = path.join(ARTIFACT_DIR, `cambodia-shipping-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  summary.screenshotPath = screenshotPath;
  writeTaskOutput(summary);
}

async function main() {
  const report = loadReport();
  console.log(`Running Shopify admin Firefox task: ${TASK}`);
  const { browser, context, userDataDir } = await launchAdminContext();
  const page = await context.newPage();

  try {
    if (TASK === 'status') {
      await runStatusTask(page);
      return;
    }

    if (TASK === 'publish-products') {
      await runPublishTask(page, selectItems(report.products), 'product', '/products');
      return;
    }

    if (TASK === 'publish-collections') {
      await runPublishTask(page, selectItems(report.collections), 'collection', '/collections');
      return;
    }

    if (TASK === 'publish-collections-bulk') {
      await runBulkCollectionPublish(page, selectItems(report.collections));
      return;
    }

    if (TASK === 'ensure-cambodia-market') {
      await runEnsureCambodiaMarketTask(page);
      return;
    }

    if (TASK === 'inspect-shipping') {
      await runInspectShippingTask(page);
      return;
    }

    if (TASK === 'ensure-cambodia-shipping') {
      await runEnsureCambodiaShippingTask(page);
      return;
    }

    throw new Error(`Unsupported SHOPIFY_ADMIN_TASK: ${TASK}`);
  } finally {
    await closeAdminContext(browser, context, userDataDir);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
