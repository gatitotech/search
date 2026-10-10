(function (root) {
  const LEGAL_VERSION = '2026-10-05';
  const STORAGE_KEY = 'gatita-search-legal-acceptance';
  function hasAccepted(storage, version = LEGAL_VERSION) {
    try {
      const record = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      return record?.version === version && typeof record.acceptedAt === 'number';
    } catch (_) { return false; }
  }
  function recordAcceptance(storage, version = LEGAL_VERSION) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify({ version, acceptedAt: Date.now() })); }
    catch (_) { /* Consent remains valid for this open page when storage is unavailable. */ }
  }
  const api = { LEGAL_VERSION, STORAGE_KEY, hasAccepted, recordAcceptance };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GatitaSearchConsent = api;
})(typeof window !== 'undefined' ? window : this);
