
export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  public hasPermission(): boolean {
    return this.permission === 'granted';
  }

  public showNotification(title: string, options?: NotificationOptions) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted.');
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: 'https://i.ibb.co/FkV0M73k/brain.png',
      badge: 'https://i.ibb.co/FkV0M73k/brain.png',
      ...options,
    };

    try {
      const n = new Notification(title, defaultOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      // Fallback for environments where the Notification constructor might fail
      console.error('Error showing notification:', e);
    }
  }

  /**
   * Simulates a scheduled notification for a deadline or appointment.
   */
  public scheduleNotification(title: string, delayMs: number, options?: NotificationOptions) {
    setTimeout(() => {
      this.showNotification(title, options);
    }, delayMs);
  }
}

export const notificationService = NotificationService.getInstance();
