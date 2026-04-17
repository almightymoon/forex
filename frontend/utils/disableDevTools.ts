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
