const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const css = read('css/styles.css');
const swSource = read('service-worker.js');
const manifest = JSON.parse(read('manifest.webmanifest'));
const normalizeCachePath = value => value.startsWith('./') ? value : `./${value}`;
const htmlLocalResources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(value => value && !value.startsWith('#') && !/^(?:https?:|data:|mailto:|tel:)/i.test(value))
  .map(normalizeCachePath);
const manifestIconResources = manifest.icons.map(icon => normalizeCachePath(icon.src));
const requiredCoreCache = new Set([
  './index.html',
  ...htmlLocalResources,
  ...manifestIconResources
]);

const requiredFiles = [
  'manifest.webmanifest', 'service-worker.js', 'js/pwa.js', 'js/responsive.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png'
];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

if (manifest.name !== 'IELTS Speaking & Writing 100-Day Mastery') throw new Error('Manifest name is incorrect');
if (manifest.start_url !== './' || manifest.scope !== './') throw new Error('Manifest is not GitHub Pages subpath-safe');
if (manifest.display !== 'standalone') throw new Error('Manifest display mode is incorrect');
if (!manifest.icons.some(icon => icon.sizes === '192x192') || !manifest.icons.some(icon => icon.sizes === '512x512')) throw new Error('Manifest icons are incomplete');
if (/"src"\s*:\s*"\//.test(JSON.stringify(manifest))) throw new Error('Manifest contains an absolute asset path');

for (const token of ['rel="manifest"', 'apple-mobile-web-app-capable', 'apple-touch-icon', 'viewport-fit=cover', 'js/pwa.js', 'js/responsive.js']) {
  if (!html.includes(token)) throw new Error(`HTML is missing ${token}`);
}
if (!css.includes('@media (min-width:768px) and (max-width:1023px)')) throw new Error('Tablet breakpoint is missing');
if (!css.includes('@media (max-width:767px)')) throw new Error('Mobile breakpoint is missing');
if (!css.includes('env(safe-area-inset-bottom)')) throw new Error('iOS safe area handling is missing');

const handlers = {};
let cachedFiles = [];
const context = {
  self: {
    addEventListener(type, handler) { handlers[type] = handler; },
    skipWaiting() {},
    clients: { claim: () => Promise.resolve() }
  },
  caches: {
    open: () => Promise.resolve({ addAll: files => { cachedFiles = files; return Promise.resolve(); } }),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    match: () => Promise.resolve(null)
  },
  fetch: () => Promise.reject(new Error('offline')),
  Response: { error: () => ({}) }
};
vm.runInNewContext(swSource, context);
if (!handlers.install || !handlers.activate || !handlers.fetch) throw new Error('Service worker lifecycle handlers are incomplete');
let installPromise;
handlers.install({ waitUntil(promise) { installPromise = promise; } });
Promise.resolve(installPromise).then(() => {
  const dayFiles = cachedFiles.filter(file => /^\.\/data\/day-\d{3}\.json$/.test(file));
  if (dayFiles.length !== 100 || new Set(dayFiles).size !== 100) throw new Error('Offline cache does not include all 100 Day JSON files');
  const cacheSet = new Set(cachedFiles);
  const missingCore = [...requiredCoreCache].filter(file => !cacheSet.has(file));
  if (missingCore.length) throw new Error(`Offline cache is missing index.html resources: ${missingCore.join(', ')}`);
  for (const file of requiredCoreCache) {
    if (!fs.existsSync(path.join(root, file.replace(/^\.\//, '')))) throw new Error(`Referenced core resource does not exist: ${file}`);
  }
  for (let id = 1; id <= 100; id++) {
    const file = path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`);
    JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  console.log('Mobile/PWA QA: PASS');
  console.log(`Cached resources: ${cachedFiles.length}; cached Day JSON files: ${dayFiles.length}; verified index/manifest core resources: ${requiredCoreCache.size}.`);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
