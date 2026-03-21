import { useState, useEffect } from 'react';
import { toastService, type Toast as ToastType } from '../lib/toast';
import './Toast.css';

/**
 * useToast - React hook to access the toast service
 *
 * Provides current toasts array and dismiss function.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  useEffect(() => {
    // Initialize with current toasts
    setToasts(toastService.getAll());

    // Subscribe to updates
    const unsubscribe = toastService.subscribe(() => {
      setToasts(toastService.getAll());
    });

    return unsubscribe;
  }, []);

  return {
    toasts,
    dismiss: toastService.dismiss.bind(toastService),
  };
}

/**
 * ToastContainer - Fixed position container for toast notifications
 *
 * Renders toasts in top-center of the screen with auto-dismiss and click-to-dismiss.
 */
export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="alert"
          onClick={() => dismiss(toast.id)}
        >
          <span className="toast__message">{toast.message}</span>
          <button
            className="toast__dismiss"
            aria-label="Dismiss notification"
            onClick={(e) => {
              e.stopPropagation();
              dismiss(toast.id);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
