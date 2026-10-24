export type NotificationType = 'PROJECT_INVITE' | 'SYSTEM';

export interface NotificationInviteData {
  invitationId?: number;
  projectId?: number;
  projectName?: string;
  projectKey?: string;
  invitedBy?: number;
  invitedByUsername?: string;
}

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  dataJson?: string;
  data?: NotificationInviteData & Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}
