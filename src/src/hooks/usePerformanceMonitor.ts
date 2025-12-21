import { useEffect, useRef } from 'react';
import { detectGoogleTranslate } from '../utils/performanceOptimizations';

/**
 * Custom hook to monitor and optimize performance in React components
 */
export function usePerformanceMonitor(componentName?: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    lastRenderTime.current = currentTime;

    // Warn if component is re-rendering too frequently (< 16ms between renders)
    if (timeSinceLastRender < 16 && renderCount.current > 1) {
      console.warn(
        `${componentName || 'Component'} is re-rendering very frequently (${timeSinceLastRender}ms). ` +
        `This may cause lag on mobile devices.`
      );
    }

    // Check for Google Translate interference
    if (renderCount.current === 1 && detectGoogleTranslate()) {
      console.warn(
        `Google Translate detected while mounting ${componentName || 'component'}. ` +
        `Performance may be affected.`
      );
    }
  });

  return {
    renderCount: renderCount.current,
  };
}

/**
 * Hook to prevent unnecessary re-renders caused by external DOM manipulation
 */
export function useStableRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef<T>(value);
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref;
}
