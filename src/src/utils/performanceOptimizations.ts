/**
 * Performance optimization utilities for mobile devices
 * Prevents Google Translate and other browser extensions from causing lag
 */

/**
 * Detects if Google Translate is active and interfering with the DOM
 */
export function detectGoogleTranslate(): boolean {
  if (typeof document === 'undefined') return false;
  
  // Check for Google Translate elements in the DOM
  const translateElements = document.querySelectorAll('font[class*="translated"]');
  const translateIframes = document.querySelectorAll('iframe[class*="goog-te"]');
  const translateToolbar = document.querySelector('.goog-te-banner-frame');
  
  return translateElements.length > 0 || translateIframes.length > 0 || translateToolbar !== null;
}

/**
 * Disables Google Translate on specific elements to prevent DOM manipulation
 */
export function disableTranslateOnElement(element: HTMLElement): void {
  if (!element) return;
  
  element.setAttribute('translate', 'no');
  element.classList.add('notranslate');
}

/**
 * Prevents text selection issues caused by Google Translate
 */
export function preventTranslateSelection(): void {
  if (typeof document === 'undefined') return;
  
  // Add meta tag if not exists
  if (!document.querySelector('meta[name="google"]')) {
    const meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.appendChild(meta);
  }
}

/**
 * Optimizes performance for mobile devices
 */
export function optimizeMobilePerformance(): void {
  if (typeof window === 'undefined') return;
  
  // Disable passive event listeners for better scroll performance
  const options = { passive: true };
  
  // Add touch event optimizations
  document.addEventListener('touchstart', () => {}, options);
  document.addEventListener('touchmove', () => {}, options);
  
  // Reduce animations on low-end devices
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection && (connection.saveData || connection.effectiveType === '2g')) {
      document.documentElement.classList.add('reduce-motion');
    }
  }
}

/**
 * Monitor and log performance issues
 */
export function monitorPerformance(): void {
  if (typeof window === 'undefined' || !window.performance) return;
  
  // Log if Google Translate is detected
  if (detectGoogleTranslate()) {
    console.warn(
      '⚠️ Google Translate detected. This may cause performance issues. ' +
      'Translation is disabled on this app for optimal performance.'
    );
  }
  
  // Monitor long tasks (> 50ms)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`Long task detected: ${entry.duration}ms`);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // PerformanceObserver not supported
    }
  }
}

/**
 * Initialize all performance optimizations
 */
export function initPerformanceOptimizations(): void {
  preventTranslateSelection();
  optimizeMobilePerformance();
  
  // Only monitor in development
  if (import.meta.env.DEV) {
    monitorPerformance();
  }
}
