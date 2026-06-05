import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

import type { AppNotificationSettings } from '../store/appStore';
import { anniversaryApi } from './anniversaryApi';
import { periodApi } from './periodApi';
import { phaseOneApi } from './phaseOneApi';

let registrationInFlight: Promise<void> | null = null;
let localScheduleInFlight: Promise<void> | null = null;
const LOCAL_NOTIFICATION_IDS_KEY = 'lovemenu.local.notification.ids';

export function registerDevicePushToken() {
  if (registrationInFlight) {
    return registrationInFlight;
  }

  registrationInFlight = registerDevicePushTokenOnce().finally(() => {
    registrationInFlight = null;
  });

  return registrationInFlight;
}

export function syncLocalNotificationSchedules(settings?: AppNotificationSettings) {
  if (localScheduleInFlight) {
    return localScheduleInFlight;
  }

  localScheduleInFlight = syncLocalNotificationSchedulesOnce(settings).finally(() => {
    localScheduleInFlight = null;
  });

  return localScheduleInFlight;
}

async function registerDevicePushTokenOnce() {
  try {
    if (Platform.OS === 'web' || Constants.appOwnership === 'expo') {
      return;
    }

    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('period-reminders', {
        name: '经期提醒',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff4f7b',
        sound: 'default',
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    const finalPermission =
      existingPermission.status === 'granted' ? existingPermission : await Notifications.requestPermissionsAsync();

    if (finalPermission.status !== 'granted') {
      return;
    }

    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await phaseOneApi.registerPushToken({
      token: tokenResponse.data,
      platform: Platform.OS,
      deviceId: Constants.sessionId ?? null,
    });
  } catch {
    // Push registration is opportunistic; app login and normal usage should continue.
  }
}

async function syncLocalNotificationSchedulesOnce(settings?: AppNotificationSettings) {
  try {
    if (Platform.OS === 'web') {
      return;
    }

    const Notifications = await import('expo-notifications');
    await configureNotificationChannel(Notifications);
    await cancelExistingLocalNotifications(Notifications);

    const permission = await ensureNotificationPermission(Notifications);
    if (!permission) {
      return;
    }

    const scheduledIds: string[] = [];
    const now = new Date();

    if (settings?.periodReminders !== false) {
      scheduledIds.push(...(await schedulePeriodNotifications(Notifications, now)));
    }

    if (settings?.anniversaryReminders !== false) {
      scheduledIds.push(...(await scheduleAnniversaryNotifications(Notifications, now)));
    }

    await SecureStore.setItemAsync(LOCAL_NOTIFICATION_IDS_KEY, JSON.stringify(scheduledIds));
  } catch {
    // Local scheduling is a best-effort backup to server push reminders.
  }
}

async function schedulePeriodNotifications(Notifications: typeof import('expo-notifications'), now: Date) {
  const scheduledIds: string[] = [];
  const [{ data: reminderSettings }, { data: overview }] = await Promise.all([
    periodApi.getReminderSettings(),
    periodApi.getHomeOverview(),
  ]);
  const dueDate = addDays(startOfDay(now), overview.daysUntilPeriod);
  const startReminderDate = addDays(dueDate, -reminderSettings.periodStartReminderOffsetDays);

  if (reminderSettings.periodStartReminderEnabled) {
    const triggerDate = withReminderTime(
      startReminderDate,
      reminderSettings.reminderHour,
      reminderSettings.reminderMinute,
    );
    if (triggerDate > now) {
      scheduledIds.push(
        await scheduleLocalNotification(Notifications, {
          title: '经期快到了',
          body: `预计 ${reminderSettings.periodStartReminderOffsetDays} 天后到经期，记得提前准备。`,
          date: triggerDate,
          data: { route: 'Period', notificationType: 'period_start_reminder' },
        }),
      );
    }
  }

  if (reminderSettings.periodDueReminderEnabled) {
    const triggerDate = withReminderTime(dueDate, reminderSettings.reminderHour, reminderSettings.reminderMinute);
    if (triggerDate > now) {
      scheduledIds.push(
        await scheduleLocalNotification(Notifications, {
          title: '预计经期到了',
          body: '今天是预计经期到来的日子，可以确认是否已经开始。',
          date: triggerDate,
          data: { route: 'Period', notificationType: 'period_due_reminder' },
        }),
      );
    }
  }

  if (reminderSettings.periodEndReminderEnabled && overview.actualPeriodStartDate && !overview.actualPeriodEndDate) {
    const expectedEndDate = addDays(
      new Date(`${overview.actualPeriodStartDate}T00:00:00`),
      overview.periodDuration - 1,
    );
    const triggerDate = withReminderTime(
      expectedEndDate,
      reminderSettings.reminderHour,
      reminderSettings.reminderMinute,
    );
    if (triggerDate > now) {
      scheduledIds.push(
        await scheduleLocalNotification(Notifications, {
          title: '经期结束记录提醒',
          body: '如果这次经期已经结束，记得补全结束时间。',
          date: triggerDate,
          data: { route: 'Period', notificationType: 'period_end_reminder' },
        }),
      );
    }
  }

  return scheduledIds;
}

async function scheduleAnniversaryNotifications(Notifications: typeof import('expo-notifications'), now: Date) {
  const { data: reminders } = await anniversaryApi.list();
  const upcoming = reminders
    .filter((item) => item.status === 'active' && item.firstRemindAt)
    .map((item) => ({
      item,
      date: new Date(item.firstRemindAt),
    }))
    .filter(({ date }) => date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 20);

  const scheduledIds: string[] = [];
  for (const { item, date } of upcoming) {
    scheduledIds.push(
      await scheduleLocalNotification(Notifications, {
        title: item.title,
        body: item.description || '有一个重要日期快到啦。',
        date,
        data: { route: 'AnniversaryDetail', reminderId: item.id, notificationType: 'anniversary_reminder' },
      }),
    );
  }

  return scheduledIds;
}

async function ensureNotificationPermission(Notifications: typeof import('expo-notifications')) {
  const existingPermission = await Notifications.getPermissionsAsync();
  const finalPermission =
    existingPermission.status === 'granted' ? existingPermission : await Notifications.requestPermissionsAsync();
  return finalPermission.status === 'granted';
}

async function configureNotificationChannel(Notifications: typeof import('expo-notifications')) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('period-reminders', {
      name: '重要提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ff4f7b',
      sound: 'default',
    });
  }
}

async function cancelExistingLocalNotifications(Notifications: typeof import('expo-notifications')) {
  const rawIds = await SecureStore.getItemAsync(LOCAL_NOTIFICATION_IDS_KEY);
  const ids = rawIds ? (JSON.parse(rawIds) as string[]) : [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  await SecureStore.deleteItemAsync(LOCAL_NOTIFICATION_IDS_KEY);
}

async function scheduleLocalNotification(
  Notifications: typeof import('expo-notifications'),
  payload: {
    title: string;
    body: string;
    date: Date;
    data: Record<string, string>;
  },
) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: payload.date,
      channelId: 'period-reminders',
    },
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function withReminderTime(date: Date, hour: number, minute: number) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}
