import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type NotificationSettingKey = 'chatMessages' | 'menuApplications' | 'anniversaryReminders' | 'periodReminders';

type PushPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: bigint) {
    const settings = await this.prisma.userNotificationSetting.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return this.toSettingsResponse(settings);
  }

  async updateSettings(
    userId: bigint,
    payload: Partial<{
      chatMessages: boolean;
      menuApplications: boolean;
      anniversaryReminders: boolean;
      periodReminders: boolean;
      quietHours: boolean;
    }>,
  ) {
    const settings = await this.prisma.userNotificationSetting.upsert({
      where: { userId },
      update: {
        chatMessages: payload.chatMessages,
        menuApplications: payload.menuApplications,
        anniversaryReminders: payload.anniversaryReminders,
        periodReminders: payload.periodReminders,
        quietHours: payload.quietHours,
      },
      create: {
        userId,
        chatMessages: payload.chatMessages,
        menuApplications: payload.menuApplications,
        anniversaryReminders: payload.anniversaryReminders,
        periodReminders: payload.periodReminders,
        quietHours: payload.quietHours,
      },
    });
    return this.toSettingsResponse(settings);
  }

  async shouldDeliver(userId: bigint, settingKey: NotificationSettingKey) {
    const settings = await this.getSettingsEntity(userId);
    if (!settings[settingKey]) {
      return false;
    }

    if (settings.quietHours && settingKey !== 'periodReminders' && this.isQuietHour(new Date())) {
      return false;
    }

    return true;
  }

  async createAndDispatch({
    userId,
    relationshipId,
    notificationType,
    title,
    content,
    targetType,
    targetId,
    settingKey,
    data,
    sentAt = new Date(),
  }: {
    userId: bigint;
    relationshipId?: bigint | null;
    notificationType: string;
    title: string;
    content?: string | null;
    targetType?: string | null;
    targetId?: bigint | null;
    settingKey: NotificationSettingKey;
    data?: Record<string, string>;
    sentAt?: Date;
  }) {
    if (!(await this.shouldDeliver(userId, settingKey))) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        relationshipId: relationshipId ?? null,
        notificationType,
        title,
        content,
        targetType,
        targetId,
        sentAt,
      },
    });

    await this.dispatchPush(userId, {
      title,
      body: content ?? '',
      data: {
        notificationId: notification.id.toString(),
        notificationType,
        ...(targetType ? { targetType } : {}),
        ...(targetId ? { targetId: targetId.toString() } : {}),
        ...data,
      },
    });

    return notification;
  }

  async dispatchPush(userId: bigint, payload: PushPayload) {
    const tokens = await this.prisma.userPushToken.findMany({
      where: { userId, status: 'active' },
      select: { token: true },
    });
    if (tokens.length === 0) {
      return;
    }

    const messages = tokens.map((item) => ({
      to: item.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      if (!response.ok) {
        return;
      }

      const result = await response.json().catch(() => null);
      const receipts = Array.isArray(result?.data) ? result.data : [];
      await Promise.all(
        receipts.map(async (receipt, index) => {
          if (
            receipt?.status === 'error' &&
            ['DeviceNotRegistered', 'InvalidCredentials'].includes(receipt?.details?.error)
          ) {
            await this.prisma.userPushToken.updateMany({
              where: { token: tokens[index]?.token },
              data: { status: 'disabled' },
            });
          }
        }),
      );
    } catch {
      // Push delivery is best-effort. Notification rows remain the source of truth.
    }
  }

  private async getSettingsEntity(userId: bigint) {
    return this.prisma.userNotificationSetting.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  private toSettingsResponse(settings: Awaited<ReturnType<NotificationsService['getSettingsEntity']>>) {
    return {
      chatMessages: settings.chatMessages,
      menuApplications: settings.menuApplications,
      anniversaryReminders: settings.anniversaryReminders,
      periodReminders: settings.periodReminders,
      quietHours: settings.quietHours,
    };
  }

  private isQuietHour(date: Date) {
    const hour = date.getHours();
    return hour >= 22 || hour < 8;
  }
}
