'use client';

import { useEffect } from 'react';
import { disableDevTools, disableReactDevTools } from '../utils/disableDevTools';

export function DevToolsProtection() {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV === 'production') {
      disableDevTools();
      disableReactDevTools();
    }
  }, []);

  return null; // This component doesn't render anything
}
