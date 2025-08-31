// Simple toast notification utility
// This provides a basic toast function that can be imported anywhere

let toastContainer: HTMLDivElement | null = null;

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const createToastContainer = () => {
  if (toastContainer) return toastContainer;
  
  // Check if we're in the browser
  if (typeof document === 'undefined') return null;
  
  toastContainer = document.createElement('div');
  toastContainer.className = 'fixed top-4 right-4 z-[9999] space-y-2 max-w-sm';
  document.body.appendChild(toastContainer);
  
  return toastContainer;
};

const getToastStyles = (type: string) => {
  const baseStyles = 'border rounded-lg shadow-lg p-4 min-w-[300px] max-w-sm transform transition-all duration-300 ease-in-out';
  
  switch (type) {
    case 'success':
      return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
    case 'error':
      return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
    case 'warning':
      return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
    case 'info':
      return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
    default:
      return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
  }
};

const getToastIcon = (type: string) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
    default:
      return 'ℹ';
  }
};

export const showToast = (message: string, type: ToastOptions['type'] = 'info', duration: number = 4000) => {
  // Check if we're in the browser to prevent hydration issues
  if (typeof window === 'undefined') return;
  
  const container = createToastContainer();
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = getToastStyles(type);
  toast.style.transform = 'translateX(100%)';
  toast.style.opacity = '0';
  
  toast.innerHTML = `
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0 mt-0.5 text-lg">
        ${getToastIcon(type)}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium leading-5">
          ${message}
        </p>
      </div>
      <button class="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none">
        ✕
      </button>
    </div>
  `;
  
  // Add close functionality
  const closeBtn = toast.querySelector('button');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removeToast(toast);
    });
  }
  
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 50);
  
  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }
};

const removeToast = (toast: HTMLDivElement) => {
  toast.style.transform = 'translateX(100%)';
  toast.style.opacity = '0';
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
};

// Convenience functions
export const showSuccessToast = (message: string, duration?: number) => showToast(message, 'success', duration);
export const showErrorToast = (message: string, duration?: number) => showToast(message, 'error', duration);
export const showWarningToast = (message: string, duration?: number) => showToast(message, 'warning', duration);
export const showInfoToast = (message: string, duration?: number) => showToast(message, 'info', duration);
