// Derives the Firefox manifest from the Chrome manifest.json.
const GECKO_ID = 'minimalreddit@proton.me.';

export function toFirefoxManifest(base) {
  const m = structuredClone(base);
  m.background = { scripts: [base.background.service_worker], type: base.background.type || 'module' };
  delete m.minimum_chrome_version;
  m.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'], optional: ['browsingActivity'] }
    },
    gecko_android: { strict_min_version: '142.0' }
  };
  return m;
}
