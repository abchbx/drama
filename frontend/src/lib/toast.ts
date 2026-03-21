export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

type ToastListener = (toast: Toast) => void;

class ToastService {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();
  private idCounter = 0;
  private readonly defaultDurations: Record<ToastType, number> = {
    info: 3000,
    success: 3000,
    warning: 5000,
    error: 5000,
  };

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.toasts[this.toasts.length - 1] ?? { id: -1, message: '', type: 'info', duration: 0 });
    }
  }

  show(message: string, type: ToastType = 'info', duration?: number): void {
    const id = ++this.idCounter;
    const actualDuration = duration ?? this.defaultDurations[type];

    const toast: Toast = {
      id,
      message,
      type,
      duration: actualDuration,
    };

    this.toasts.push(toast);
    this.notify();

    // Auto-dismiss after duration
    setTimeout(() => {
      this.dismiss(id);
    }, actualDuration);
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  getAll(): Toast[] {
    return [...this.toasts];
  }

  clear(): void {
    this.toasts = [];
    this.notify();
  }
}

export const toastService = new ToastService();
