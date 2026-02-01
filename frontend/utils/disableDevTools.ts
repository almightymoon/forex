/**
 * Client-side protection against DevTools and right-click inspection
 * Note: This can be bypassed by determined users, but adds a layer of protection
 */

export const disableDevTools = () => {
  if (typeof window === 'undefined') return;

  // Only in production
  if (process.env.NODE_ENV !== 'production') return;

  // Disable console logs (except error and warn)
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
  console.table = noop;
  console.group = noop;
  console.groupEnd = noop;

  // Disable right-click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable common keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+I or Cmd+Option+I (DevTools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+J or Cmd+Option+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+C or Cmd+Option+C (Inspect element)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+U or Cmd+U (View source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+S or Cmd+S (Save page)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      return false;
    }
  });

  // Detect if DevTools is open (width-based detection)
  const detectDevTools = () => {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      // Redirect or show warning when DevTools detected
      document.body.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: system-ui, -apple-system, sans-serif;
          text-align: center;
          padding: 20px;
        ">
          <div>
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">⚠️ Access Restricted</h1>
            <p style="font-size: 1.25rem; opacity: 0.9;">Developer tools are not allowed on this platform.</p>
            <p style="font-size: 1rem; opacity: 0.8; margin-top: 1rem;">Please close DevTools and refresh the page.</p>
          </div>
        </div>
      `;
    }
  };

  // Check periodically
  setInterval(detectDevTools, 1000);
  
  // Disable text selection on sensitive areas
  const style = document.createElement('style');
  style.innerHTML = `
    * {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    input, textarea {
      -webkit-user-select: text !important;
      -khtml-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);
};

// Disable React DevTools
export const disableReactDevTools = () => {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') return;

  // @ts-ignore
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
    // @ts-ignore
    for (let [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
      // @ts-ignore
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
    }
  }
};
