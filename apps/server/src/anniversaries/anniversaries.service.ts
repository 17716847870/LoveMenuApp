import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Reminder } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

type ReminderPayload = {
  relationship_id: number;
  title: string;
  description?: string | null;
  target_date: string;
  first_remind_at: string;
  date_rule_type?: string | null;
  rule_month?: number | null;
  rule_day?: number | null;
  rule_week_of_month?: number | null;
  rule_weekday?: number | null;
  remind_type: string;
  period_type?: string | null;
  custom_days?: number | null;
  repeat_times?: number | null;
  status?: string;
  permission_type?: string | null;
};

function toBigIntId(id: number) {
  return BigInt(id);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextYearlyOccurrence(baseDate: Date, now = new Date()) {
  const currentYearDate = new Date(now.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 9, 0, 0);
  const nextDate =
    startOfLocalDay(currentYearDate).getTime() >= startOfLocalDay(now).getTime()
      ? currentYearDate
      : new Date(now.getFullYear() + 1, baseDate.getMonth(), baseDate.getDate(), 9, 0, 0);

  return {
    nextDate,
    anniversaryYears: Math.max(1, nextDate.getFullYear() - baseDate.getFullYear()),
  };
}

function getWeekdayOfMonthDate(year: number, month: number, weekOfMonth: number, weekday: number) {
  const firstDate = new Date(year, month - 1, 1, 9, 0, 0);
  const firstWeekday = firstDate.getDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (weekOfMonth - 1) * 7;
  return new Date(year, month - 1, day, 9, 0, 0);
}

function resolveRuleDate(payload: Partial<ReminderPayload>, fallbackDate: Date, now = new Date()) {
  if (
    payload.date_rule_type === 'weekday_of_month' &&
    payload.rule_month &&
    payload.rule_week_of_month != null &&
    payload.rule_weekday != null
  ) {
    const currentYearDate = getWeekdayOfMonthDate(
      now.getFullYear(),
      payload.rule_month,
      payload.rule_week_of_month,
      payload.rule_weekday,
    );
    return startOfLocalDay(currentYearDate).getTime() >= startOfLocalDay(now).getTime()
      ? currentYearDate
      : getWeekdayOfMonthDate(
          now.getFullYear() + 1,
          payload.rule_month,
          payload.rule_week_of_month,
          payload.rule_weekday,
        );
  }

  if (
    (payload.date_rule_type === 'fixed_solar' || payload.date_rule_type === 'fixed_lunar') &&
    payload.rule_month &&
    payload.rule_day
  ) {
    const currentYearDate = new Date(
      now.getFullYear(),
      payload.rule_month - 1,
      payload.rule_day,
      fallbackDate.getHours(),
      fallbackDate.getMinutes(),
      0,
    );
    return startOfLocalDay(currentYearDate).getTime() >= startOfLocalDay(now).getTime()
      ? currentYearDate
      : new Date(
          now.getFullYear() + 1,
          payload.rule_month - 1,
          payload.rule_day,
          fallbackDate.getHours(),
          fallbackDate.getMinutes(),
          0,
        );
  }

  return fallbackDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function isTogetherAnniversary(reminder: Reminder) {
  return reminder.title === '在一起纪念日' && reminder.periodType === 'yearly';
}

@Injectable()
export class AnniversariesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnniversariesService.name);
  private reminderTimer?: NodeJS.Timeout;
  private reminderScanRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.reminderTimer = setInterval(() => {
      void this.dispatchDueReminders().catch((error) => {
        this.logger.error('Failed to dispatch anniversary reminders', error);
      });
    }, 60000);
    void this.dispatchDueReminders().catch((error) => {
      this.logger.error('Failed to dispatch anniversary reminders', error);
    });
  }

  onModuleDestroy() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
    }
  }

  async ensureTogetherAnniversary(relationshipId: bigint, creatorUserId: bigint, togetherSince: Date) {
    const { nextDate } = nextYearlyOccurrence(togetherSince);
    const firstRemindAt = addDays(nextDate, -7);
    const existingReminder = await this.prisma.reminder.findFirst({
      where: {
        relationshipId,
        title: '在一起纪念日',
      },
    });

    if (existingReminder) {
      return this.prisma.reminder.update({
        where: {
          id: existingReminder.id,
        },
        data: {
          creatorUserId,
          targetDate: togetherSince,
          firstRemindAt,
          remindType: 'repeat',
          periodType: 'yearly',
          status: 'active',
          permissionType: 'partner_editable',
          nextTriggerAt: firstRemindAt,
        },
      });
    }

    return this.prisma.reminder.create({
      data: {
        relationshipId,
        creatorUserId,
        title: '在一起纪念日',
        description: '记录你们正式在一起的那一天。',
        targetDate: togetherSince,
        firstRemindAt,
        remindType: 'repeat',
        periodType: 'yearly',
        completedTimes: 0,
        status: 'active',
        permissionType: 'partner_editable',
        nextTriggerAt: firstRemindAt,
      },
    });
  }

  async listForUser(viewerUserId: bigint) {
    const relationship = await this.prisma.coupleRelationship.findFirst({
      where: {
        status: 'active',
        OR: [{ userAId: viewerUserId }, { userBId: viewerUserId }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!relationship) {
      return [];
    }

    const reminders = await this.prisma.reminder.findMany({
      where: {
        relationshipId: relationship.id,
        OR: [
          {
            creatorUserId: viewerUserId,
          },
          {
            permissionType: {
              not: 'private',
            },
          },
        ],
      },
      orderBy: {
        targetDate: 'asc',
      },
    });

    return Promise.all(reminders.map((reminder) => this.toAnniversaryResponse(reminder)));
  }

  async get(id: number, viewerUserId?: bigint | number) {
    const reminder = await this.prisma.reminder.findUnique({
      where: {
        id: toBigIntId(id),
      },
    });

    if (!reminder) {
      throw new NotFoundException('anniversary not found');
    }

    const viewerId = typeof viewerUserId === 'number' ? toBigIntId(viewerUserId) : viewerUserId;
    if (viewerId && reminder.permissionType === 'private' && reminder.creatorUserId !== viewerId) {
      throw new ForbiddenException('anniversary is private');
    }

    return this.toAnniversaryResponse(reminder);
  }

  async create(payload: ReminderPayload, creatorUserId: bigint) {
    const targetDate = resolveRuleDate(payload, new Date(payload.target_date));
    const reminder = await this.prisma.reminder.create({
      data: {
        relationshipId: toBigIntId(payload.relationship_id),
        creatorUserId,
        title: payload.title,
        description: payload.description,
        targetDate,
        firstRemindAt: new Date(payload.first_remind_at),
        dateRuleType: payload.date_rule_type,
        ruleMonth: payload.rule_month,
        ruleDay: payload.rule_day,
        ruleWeekOfMonth: payload.rule_week_of_month,
        ruleWeekday: payload.rule_weekday,
        remindType: payload.remind_type,
        periodType: payload.period_type,
        customDays: payload.custom_days,
        repeatTimes: payload.repeat_times,
        status: payload.status ?? 'active',
        permissionType: payload.permission_type ?? 'partner_visible',
        nextTriggerAt: new Date(payload.first_remind_at),
      },
    });

    return this.toAnniversaryResponse(reminder);
  }

  async update(id: number, payload: Partial<ReminderPayload>, operatorUserId?: bigint) {
    const existingReminder = await this.prisma.reminder.findUnique({
      where: {
        id: toBigIntId(id),
      },
    });

    if (!existingReminder) {
      throw new NotFoundException('anniversary not found');
    }

    const currentUserId = operatorUserId;
    const isCreator = currentUserId ? existingReminder.creatorUserId === currentUserId : false;

    if (currentUserId && !isCreator && existingReminder.permissionType !== 'partner_editable') {
      throw new ForbiddenException('anniversary is not editable');
    }

    if (payload.permission_type && !isCreator) {
      throw new ForbiddenException('only creator can update permission');
    }

    const reminder = await this.prisma.reminder.update({
      where: {
        id: toBigIntId(id),
      },
      data: {
        title: payload.title,
        description: payload.description,
        targetDate: payload.target_date ? resolveRuleDate(payload, new Date(payload.target_date)) : undefined,
        firstRemindAt: payload.first_remind_at ? new Date(payload.first_remind_at) : undefined,
        dateRuleType: payload.date_rule_type,
        ruleMonth: payload.rule_month,
        ruleDay: payload.rule_day,
        ruleWeekOfMonth: payload.rule_week_of_month,
        ruleWeekday: payload.rule_weekday,
        remindType: payload.remind_type,
        periodType: payload.period_type,
        customDays: payload.custom_days,
        repeatTimes: payload.repeat_times,
        status: payload.status,
        permissionType: payload.permission_type ?? undefined,
        nextTriggerAt: payload.first_remind_at ? new Date(payload.first_remind_at) : undefined,
      },
    });

    return this.toAnniversaryResponse(reminder);
  }

  async delete(id: number, operatorUserId: bigint) {
    const existingReminder = await this.prisma.reminder.findUnique({
      where: {
        id: toBigIntId(id),
      },
    });

    if (!existingReminder) {
      throw new NotFoundException('anniversary not found');
    }

    if (existingReminder.creatorUserId !== operatorUserId) {
      throw new ForbiddenException('only creator can delete anniversary');
    }

    if (isTogetherAnniversary(existingReminder)) {
      throw new ForbiddenException('together anniversary cannot be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reminderTriggerLog.deleteMany({
        where: {
          reminderId: existingReminder.id,
        },
      });
      await tx.reminder.delete({
        where: {
          id: existingReminder.id,
        },
      });
    });

    return {
      id: existingReminder.id,
      deleted: true,
    };
  }

  private async toAnniversaryResponse(reminder: Reminder) {
    const creator = await this.prisma.user.findUnique({
      where: {
        id: reminder.creatorUserId,
      },
    });
    const systemTogetherAnniversary = isTogetherAnniversary(reminder);
    const { nextDate, anniversaryYears } = systemTogetherAnniversary
      ? nextYearlyOccurrence(reminder.targetDate)
      : { nextDate: reminder.targetDate, anniversaryYears: null };
    const displayTitle = systemTogetherAnniversary ? `在一起 ${anniversaryYears} 周年` : reminder.title;
    const targetDate = systemTogetherAnniversary ? nextDate : reminder.targetDate;
    const firstRemindAt = systemTogetherAnniversary ? addDays(nextDate, -7) : reminder.firstRemindAt;

    return {
      id: reminder.id,
      title: displayTitle,
      baseTitle: reminder.title,
      creatorUserId: reminder.creatorUserId,
      description: reminder.description ?? '',
      targetDate,
      firstRemindAt,
      calendarType: 'solar',
      originalCalendarYear: reminder.targetDate.getFullYear(),
      originalCalendarMonth: reminder.targetDate.getMonth() + 1,
      originalCalendarDay: reminder.targetDate.getDate(),
      remindOffsetDays: Math.max(0, Math.round((targetDate.getTime() - firstRemindAt.getTime()) / 86400000)),
      dateRuleType: reminder.dateRuleType,
      ruleMonth: reminder.ruleMonth,
      ruleDay: reminder.ruleDay,
      ruleWeekOfMonth: reminder.ruleWeekOfMonth,
      ruleWeekday: reminder.ruleWeekday,
      remindType: reminder.remindType,
      periodType: reminder.periodType,
      customDays: reminder.customDays,
      repeatTimes: reminder.repeatTimes,
      completedTimes: reminder.completedTimes,
      status: reminder.status,
      nextTriggerAt: reminder.nextTriggerAt,
      lastTriggerAt: reminder.lastTriggerAt,
      createdBy: creator?.nickname ?? `用户${reminder.creatorUserId.toString()}`,
      permissionType: reminder.permissionType,
      anniversaryYears,
    };
  }

  private async dispatchDueReminders() {
    if (this.reminderScanRunning) {
      return;
    }
    this.reminderScanRunning = true;

    try {
      const now = new Date();
      const dueReminders = await this.prisma.reminder.findMany({
        where: {
          status: 'active',
          nextTriggerAt: { lte: now },
        },
        orderBy: { nextTriggerAt: 'asc' },
        take: 100,
      });

      for (const reminder of dueReminders) {
        await this.dispatchReminder(reminder, now);
      }
    } finally {
      this.reminderScanRunning = false;
    }
  }

  private async dispatchReminder(reminder: Reminder, now: Date) {
    const recipients = await this.resolveReminderRecipients(reminder);
    const response = await this.toAnniversaryResponse(reminder);
    const body = reminder.description || '有一个重要日期到啦，记得一起好好纪念。';

    for (const userId of recipients) {
      await this.notificationsService.createAndDispatch({
        userId,
        relationshipId: reminder.relationshipId,
        notificationType: 'anniversary_reminder',
        title: response.title,
        content: body,
        targetType: 'anniversary',
        targetId: reminder.id,
        settingKey: 'anniversaryReminders',
        sentAt: now,
        data: {
          route: 'AnniversaryDetail',
          reminderId: reminder.id.toString(),
        },
      });
    }

    const completedTimes = reminder.completedTimes + 1;
    const nextTriggerAt = this.resolveNextTriggerAt(reminder, now);
    const isCompleted =
      reminder.remindType === 'single' ||
      (reminder.remindType === 'multiple' && reminder.repeatTimes != null && completedTimes >= reminder.repeatTimes);

    await this.prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        completedTimes,
        lastTriggerAt: now,
        nextTriggerAt: isCompleted ? null : nextTriggerAt,
        status: isCompleted ? 'completed' : reminder.status,
      },
    });

    await this.prisma.reminderTriggerLog.create({
      data: {
        reminderId: reminder.id,
        triggeredAt: now,
        triggerStatus: recipients.length > 0 ? 'sent' : 'skipped',
      },
    });
  }

  private async resolveReminderRecipients(reminder: Reminder) {
    const relationship = await this.prisma.coupleRelationship.findUnique({
      where: { id: reminder.relationshipId },
    });
    if (!relationship || relationship.status !== 'active') {
      return [reminder.creatorUserId];
    }

    if (reminder.permissionType === 'private') {
      return [reminder.creatorUserId];
    }

    const partnerId = relationship.userAId === reminder.creatorUserId ? relationship.userBId : relationship.userAId;
    return Array.from(new Set([reminder.creatorUserId.toString(), partnerId.toString()])).map((id) => BigInt(id));
  }

  private resolveNextTriggerAt(reminder: Reminder, now: Date) {
    const base = reminder.nextTriggerAt && reminder.nextTriggerAt > now ? reminder.nextTriggerAt : now;
    const next = new Date(base);

    switch (reminder.periodType) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarter':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'half_year':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'custom_days':
        next.setDate(next.getDate() + Math.max(1, reminder.customDays ?? 1));
        break;
      case 'yearly':
      default:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }
}
