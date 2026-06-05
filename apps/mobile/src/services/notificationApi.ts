import type { AppNotificationSettings } from '../store/appStore';
import { patch, request } from './apiClient';

type NotificationSettingsResponse = {
  chat_messages: boolean;
  menu_applications: boolean;
  anniversary_reminders: boolean;
  period_reminders: boolean;
  quiet_hours: boolean;
};

function normalizeSettings(settings: NotificationSettingsResponse): AppNotificationSettings {
  return {
    chatMessages: settings.chat_messages,
    menuApplications: settings.menu_applications,
    anniversaryReminders: settings.anniversary_reminders,
    periodReminders: settings.period_reminders,
    quietHours: settings.quiet_hours,
  };
}

export const notificationApi = {
  async getSettings() {
    const response = await request<NotificationSettingsResponse>('/notifications/settings');
    return { data: normalizeSettings(response.data) };
  },

  async updateSettings(payload: Partial<AppNotificationSettings>) {
    const response = await patch<NotificationSettingsResponse>('/notifications/settings', payload);
    return { data: normalizeSettings(response.data) };
  },
};
