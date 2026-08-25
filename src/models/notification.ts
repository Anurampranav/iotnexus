export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string; // ISO
  deviceId?: string;
  automationId?: string;
  actionRoute?: string; // deep link
}
