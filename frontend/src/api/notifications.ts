import apiClient from './client';
import type { Notification, NotificationsResponse } from '../types';

export const notificationsApi = {
  async getNotifications(): Promise<NotificationsResponse> {
    const response = await apiClient.get<NotificationsResponse>('/notifications');
    return response.data;
  },

  async markAsRead(notificationId: number): Promise<Notification> {
    const response = await apiClient.put<Notification>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{ message: string; unreadCount: number }> {
    const response = await apiClient.put<{ message: string; unreadCount: number }>('/notifications/read-all');
    return response.data;
  },
};
