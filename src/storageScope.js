// GitHub project pages share an origin. Separate their storage by application root.
export function storagePath(base, href) {
  const path = new URL(base || './', href).pathname;
  return path.endsWith('/') ? path : path + '/';
}
export const APP_PATH = typeof window === 'undefined'
  ? '/__node_tests__/'
  : storagePath(import.meta.env?.BASE_URL || './', window.location.href);
export const DRAFT_DB_NAME = 'baustellenbegehung-drafts:' + APP_PATH;
export const LEGACY_DRAFT_DB_NAME = 'baustellenbegehung-drafts';
export const preferenceKey = key => 'baustellenbegehung:' + APP_PATH + ':' + key;
export const mayReadLegacyPreferences = APP_PATH === '/baustellenbegehung-app/';
// The unscoped draft DB was introduced by the test versions, not the old live app.
export const mayImportLegacyDrafts = APP_PATH === '/baustellenbegehung-test/site/' || APP_PATH === '/';
