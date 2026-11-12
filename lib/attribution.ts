const STORAGE_KEY = 'rova_ad_source';
const TIMESTAMP_KEY = 'rova_ad_source_time';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days attribution window

/**
 * Parses URL search params or falls back to stored attribution (sessionStorage / localStorage).
 * Persists attribution across page refreshes, internal links, and product clicks.
 * Also supports utm_content (e.g. video creative name).
 */
export function getOrderSource(): string {
  if (typeof window === 'undefined') return 'organic';

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fbclid = searchParams.get('fbclid');
    const ttclid = searchParams.get('ttclid');
    const utm_source = searchParams.get('utm_source')?.toLowerCase();
    const utm_campaign = searchParams.get('utm_campaign');
    const utm_content = searchParams.get('utm_content');

    let currentSource: string | null = null;

    // Check if current URL contains ad traffic parameters
    if (fbclid || utm_source === 'meta' || utm_source === 'facebook' || utm_source === 'ig') {
      if (utm_campaign) {
        currentSource = utm_content ? `meta:${utm_campaign}:${utm_content}` : `meta:${utm_campaign}`;
      } else {
        currentSource = 'meta';
      }
    } else if (ttclid || utm_source === 'tiktok') {
      if (utm_campaign) {
        currentSource = utm_content ? `tiktok:${utm_campaign}:${utm_content}` : `tiktok:${utm_campaign}`;
      } else {
        currentSource = 'tiktok';
      }
    } else if (utm_campaign) {
      currentSource = utm_content ? `${utm_campaign}:${utm_content}` : utm_campaign;
    }

    // If new attribution found in current URL, save it
    if (currentSource) {
      sessionStorage.setItem(STORAGE_KEY, currentSource);
      localStorage.setItem(STORAGE_KEY, currentSource);
      localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
      return currentSource;
    }

    // Fallback 1: check sessionStorage (persists across page reloads & internal navigations in tab)
    const sessionSource = sessionStorage.getItem(STORAGE_KEY);
    if (sessionSource) {
      return sessionSource;
    }

    // Fallback 2: check localStorage (within 30 days)
    const localSource = localStorage.getItem(STORAGE_KEY);
    const localTime = localStorage.getItem(TIMESTAMP_KEY);
    if (localSource && localTime) {
      const age = Date.now() - parseInt(localTime, 10);
      if (age < MAX_AGE_MS) {
        return localSource;
      }
    }
  } catch (e) {
    console.error('Attribution error:', e);
  }

  return 'organic';
}

/**
 * Initializes attribution tracking on page load so source is immediately remembered.
 */
export function initAttribution(): void {
  if (typeof window !== 'undefined') {
    getOrderSource();
  }
}
