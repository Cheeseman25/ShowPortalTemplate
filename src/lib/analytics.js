// Google Analytics 4 event helper (gtag is loaded in index.html).

export function trackAnalyticsEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}
