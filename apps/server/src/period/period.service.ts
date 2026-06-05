import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MenstrualDailyLog, MenstrualProfile, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PeriodAiInsight, PeriodAiService, PeriodAiSymptomTrend } from './period-ai.service';

type SelectedDateCycleDto = {
  status: 'completed' | 'in_progress';
  startedOn: string;
  endedOn: string | null;
  isStartDate: boolean;
  isEndDate: boolean;
};

type StatusCardActionKey =
  | 'confirm_start'
  | 'confirm_end'
  | 'edit_record'
  | 'adjust_current_start'
  | 'adjust_history_cycle'
  | 'backfill_history_disabled'
  | 'disabled';

type StatusCardDto = {
  tone: 'active' | 'blocked' | 'ready';
  eyebrow: string;
  title: string;
  description: string;
  meta: string | null;
  actions: Array<{
    key: StatusCardActionKey;
    label: string;
    enabled: boolean;
    icon: 'check' | 'edit' | 'record' | 'lock';
  }>;
};

type DailyRecordPayload = {
  recordDate: string;
  recordType?: 'period' | 'daily';
  isPeriodDay?: boolean;
  selectedDateCycle?: SelectedDateCycleDto | null;
  statusCard?: StatusCardDto;
  cycleDaySnapshot?: number | null;
  cycleDaySource?: 'auto' | 'user_confirmed' | 'adjusted' | null;
  cycleDayLocked?: boolean;
  calculatedCycleDay?: number | null;
  hasRecord?: boolean;
  mood: string;
  flow: string;
  painLevel: number;
  bloodColor: string;
  bloodClot: boolean;
  dischargeType: string;
  abdomenPainArea: string;
  backPainLevel: number;
  breastTendernessLevel: number;
  skinStatus: string;
  sleepQuality: string;
  stressLevel: number;
  dietStatus: string;
  exerciseLevel: string;
  symptoms: string[];
  weightKg: string;
  temperature: string;
  abnormalEvent: string;
  note: string;
};

type BasePrediction = {
  validCycles: Array<{
    startedOn: Date;
    endedOn: Date | null;
    cycleLengthDays: number | null;
    periodLengthDays: number | null;
    status: string;
  }>;
  allCycles: Array<{
    startedOn: Date;
    endedOn: Date | null;
    cycleLengthDays: number | null;
    periodLengthDays: number | null;
    status: string;
  }>;
  recentCycleLengths: number[];
  recentPeriodLengths: number[];
  baseCycleLengthDays: number;
  basePeriodLengthDays: number;
  predictedPeriodStartDate: Date;
  predictedPeriodEndDate: Date;
  predictedOvulationDate: Date;
  predictedOvulationWindowStart: Date;
  predictedOvulationWindowEnd: Date;
  currentCyclePhase: 'period' | 'follicular' | 'ovulation' | 'luteal';
  cycleVariance: number;
  periodVariance: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  referenceOnlyFlag: boolean;
  missingDataFlag: boolean;
  abnormalCycleCount: number;
};

const RECENT_WEIGHTS = [0.3, 0.25, 0.2, 0.12, 0.08, 0.05];
const MIN_VALID_PERIOD_DAYS = 2;
const MAX_VALID_PERIOD_DAYS = 15;
const MIN_VALID_CYCLE_DAYS = 15;
const MAX_VALID_CYCLE_DAYS = 90;

const defaultDailyRecord = (recordDate: string): DailyRecordPayload => ({
  recordDate,
  recordType: 'daily',
  isPeriodDay: false,
  selectedDateCycle: null,
  statusCard: {
    tone: 'blocked',
    eyebrow: '等待同步',
    title: '正在同步经期状态',
    description: '稍等一下，系统正在读取所选日期的经期归属。',
    meta: null,
    actions: [{ key: 'disabled', label: '暂不可操作', enabled: false, icon: 'lock' }],
  },
  cycleDaySnapshot: null,
  cycleDaySource: null,
  cycleDayLocked: false,
  calculatedCycleDay: null,
  hasRecord: false,
  mood: '平静',
  flow: '中等',
  painLevel: 0,
  bloodColor: '鲜红',
  bloodClot: false,
  dischargeType: '无明显变化',
  abdomenPainArea: '无腹痛',
  backPainLevel: 0,
  breastTendernessLevel: 0,
  skinStatus: '稳定',
  sleepQuality: '一般',
  stressLevel: 0,
  dietStatus: '正常',
  exerciseLevel: '低',
  symptoms: [],
  weightKg: '',
  temperature: '',
  abnormalEvent: '',
  note: '',
});

@Injectable()
export class PeriodService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PeriodService.name);
  private reminderTimer?: NodeJS.Timeout;
  private reminderScanRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly periodAiService: PeriodAiService,
  ) {}

  onModuleInit() {
    this.reminderTimer = setInterval(() => {
      void this.dispatchDueReminders().catch((error) => {
        this.logger.error('Failed to dispatch period reminders', error);
      });
    }, 60000);
    void this.dispatchDueReminders().catch((error) => {
      this.logger.error('Failed to dispatch period reminders', error);
    });
  }

  onModuleDestroy() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
    }
  }

  getDailyRecordOptions() {
    return {
      moodOptions: ['开心', '平静', '低落', '烦躁'],
      flowOptions: ['少量', '中等', '大量'],
      bloodColorOptions: ['鲜红', '暗红', '褐色'],
      dischargeOptions: ['无明显变化', '少量透明', '拉丝样'],
      abdomenAreas: ['无腹痛', '下腹部', '左侧', '右侧', '整体坠胀'],
      skinOptions: ['稳定', '轻微爆痘', '明显出油'],
      sleepOptions: ['好', '一般', '差'],
      dietOptions: ['正常', '胃口变大', '想吃甜食', '食欲下降'],
      exerciseOptions: ['低', '中', '高'],
      symptomOptions: ['爆痘', '腹胀', '嘴馋', '疲劳'],
    };
  }

  async getOverview(userId: bigint) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    if (profile.femaleUserId !== userId && (!profile.maleAccessGranted || !profile.maleViewEnabled)) {
      return this.buildRestrictedOverview(profile);
    }
    return this.buildOverview(profile);
  }

  async getCalendarMonth(userId: bigint, year: number, month: number) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    await this.ensureCanView(context, profile);
    const overview = await this.buildOverview(profile);
    const markers: Array<{ date: string; type: string }> = [];
    const pushMarker = (date: Date | null | undefined, type: string, force = false) => {
      if (date && date.getFullYear() === year && date.getMonth() + 1 === month) {
        const dateKey = toDateKey(date);
        if (!force && markers.some((marker) => marker.date === dateKey && marker.type === type)) {
          return;
        }
        markers.push({ date: dateKey, type });
      }
    };

    const cycles = await this.prisma.menstrualCycle.findMany({
      where: { profileId: profile.id },
      orderBy: { startedOn: 'desc' },
      take: 8,
    });
    const activeCycle = cycles.find((cycle) => cycle.status === 'in_progress');
    const completedPeriodLengths = cycles
      .filter((cycle) => cycle.status === 'completed')
      .map((cycle) => (cycle.endedOn ? diffDays(cycle.endedOn, cycle.startedOn) + 1 : cycle.periodLengthDays))
      .filter(isNumber)
      .filter((days) => days >= MIN_VALID_PERIOD_DAYS && days <= MAX_VALID_PERIOD_DAYS);
    const expectedActivePeriodDays = weightedAverage(completedPeriodLengths, overview.periodDuration || 5);

    for (const cycle of cycles) {
      if (activeCycle && cycle.startedOn > activeCycle.startedOn) {
        continue;
      }

      const periodDays =
        cycle.status === 'in_progress'
          ? expectedActivePeriodDays
          : cycle.endedOn
            ? diffDays(cycle.endedOn, cycle.startedOn) + 1
            : (cycle.periodLengthDays ?? 5);
      for (let index = 0; index < periodDays; index += 1) {
        pushMarker(
          addDays(cycle.startedOn, index),
          index === 0 || index === periodDays - 1 ? 'period' : 'period_range',
        );
      }
    }

    const predictedMarkers = await this.buildPredictedPhaseMarkers(profile, year, month, overview);
    const nextAllowedPredictedPeriodStart = activeCycle ? addDays(activeCycle.startedOn, overview.cycleLength) : null;
    for (const marker of predictedMarkers) {
      if (
        nextAllowedPredictedPeriodStart &&
        marker.type === 'predicted_period' &&
        marker.date < nextAllowedPredictedPeriodStart
      ) {
        continue;
      }
      pushMarker(marker.date, marker.type);
    }

    return {
      year,
      month,
      cycleDay: overview.cycleDay,
      summaryText: `今天是你周期的第 ${overview.cycleDay} 天`,
      selectedDay:
        new Date().getFullYear() === year && new Date().getMonth() + 1 === month ? new Date().getDate() : null,
      markers,
    };
  }

  async getPrediction(userId: bigint) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    await this.ensureCanView(context, profile);
    const overview = await this.buildOverview(profile);
    const insight = await this.generateAndStoreAiInsight(profile, overview);
    const today = parseDateOnly(toDateKey(new Date()));
    const basePrediction = await this.buildBasePrediction(profile);
    const baseNextPeriodStart = basePrediction.predictedPeriodStartDate;
    const nextPeriodStart = insight.adjustedPeriodStartDate
      ? parseDateOnly(insight.adjustedPeriodStartDate)
      : baseNextPeriodStart;
    const nextPeriodEnd = insight.adjustedPeriodEndDate ? parseDateOnly(insight.adjustedPeriodEndDate) : null;
    const ovulationStart = insight.adjustedOvulationWindowStart
      ? parseDateOnly(insight.adjustedOvulationWindowStart)
      : null;
    const ovulationEnd = insight.adjustedOvulationWindowEnd ? parseDateOnly(insight.adjustedOvulationWindowEnd) : null;

    return {
      basePrediction: {
        cycleLengthDays: basePrediction.baseCycleLengthDays,
        periodLengthDays: basePrediction.basePeriodLengthDays,
        predictedPeriodStartDate: toDateKey(basePrediction.predictedPeriodStartDate),
        predictedPeriodEndDate: toDateKey(basePrediction.predictedPeriodEndDate),
        predictedOvulationDate: toDateKey(basePrediction.predictedOvulationDate),
        predictedOvulationWindowStart: toDateKey(basePrediction.predictedOvulationWindowStart),
        predictedOvulationWindowEnd: toDateKey(basePrediction.predictedOvulationWindowEnd),
        currentCyclePhase: basePrediction.currentCyclePhase,
      },
      aiAdjustment: {
        adjustedPeriodStartDate: insight.adjustedPeriodStartDate,
        adjustedPeriodEndDate: insight.adjustedPeriodEndDate,
        adjustedOvulationDate: insight.adjustedOvulationDate,
        adjustedOvulationWindowStart: insight.adjustedOvulationWindowStart,
        adjustedOvulationWindowEnd: insight.adjustedOvulationWindowEnd,
        adjustedCurrentCyclePhase: insight.adjustedCurrentCyclePhase,
        adjustmentDaysForPeriodStart: insight.adjustedPeriodStartDate
          ? diffDays(parseDateOnly(insight.adjustedPeriodStartDate), basePrediction.predictedPeriodStartDate)
          : null,
        adjustmentDaysForPeriodEnd: insight.adjustedPeriodEndDate
          ? diffDays(parseDateOnly(insight.adjustedPeriodEndDate), basePrediction.predictedPeriodEndDate)
          : null,
        adjustmentDaysForOvulation: insight.adjustedOvulationDate
          ? diffDays(parseDateOnly(insight.adjustedOvulationDate), basePrediction.predictedOvulationDate)
          : null,
        confidenceScore: insight.confidenceScore ?? basePrediction.confidenceScore,
        confidenceLevel: insight.confidenceLevel,
        adjustmentReasonSummary: insight.reasonSummary,
        referenceOnlyFlag: basePrediction.referenceOnlyFlag || insight.confidenceLevel === 'low',
      },
      nextPeriodDateLabel: formatCnDateLabel(nextPeriodStart),
      daysUntilPeriod: Math.max(0, diffDays(nextPeriodStart, today)),
      ovulationRangeLabel:
        ovulationStart && ovulationEnd
          ? `${formatCnDateLabel(ovulationStart)} - ${formatCnDateLabel(ovulationEnd)}`
          : `${formatCnDateLabel(basePrediction.predictedOvulationWindowStart)} - ${formatCnDateLabel(basePrediction.predictedOvulationWindowEnd)}`,
      confidencePercent: Math.round((insight.confidenceScore ?? confidenceLevelToScore(insight.confidenceLevel)) * 100),
      aiAvailable: insight.aiAvailable,
      aiAdjusted: Boolean(
        insight.aiAvailable &&
        (insight.adjustedPeriodStartDate || insight.adjustedOvulationDate || insight.adjustedCurrentCyclePhase),
      ),
      adjustmentReasonSummary: insight.reasonSummary,
      adjustedPeriodEndDateLabel: nextPeriodEnd ? formatCnDateLabel(nextPeriodEnd) : '',
      advice:
        insight.healthTips.length > 0
          ? insight.healthTips
          : [
              overview.currentPhaseKey === 'period'
                ? '经期中注意保暖，避免生冷和剧烈运动。'
                : '保持规律作息，有助于提高下次预测准确度。',
              '如果出现明显异常疼痛或周期大幅变化，建议及时咨询专业医生。',
            ],
    };
  }

  async getAnalysis(userId: bigint) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    await this.ensureCanView(context, profile);
    const cycles = await this.prisma.menstrualCycle.findMany({
      where: { profileId: profile.id, status: { in: ['completed', 'in_progress'] } },
      orderBy: { startedOn: 'desc' },
      take: 6,
    });
    const basePrediction = await this.buildBasePrediction(profile);
    const sorted = [...basePrediction.validCycles].sort((a, b) => a.startedOn.getTime() - b.startedOn.getTime());
    const cycleLengths = sorted.map((item) => item.cycleLengthDays).filter(isNumber);
    const durationLengths = sorted.map((item) => item.periodLengthDays).filter(isNumber);
    const monthLabels = sorted.map((item) => `${item.startedOn.getMonth() + 1}月`);
    const avgCycle = basePrediction.baseCycleLengthDays;
    const avgDuration = basePrediction.basePeriodLengthDays;
    const regularityLabel =
      basePrediction.cycleVariance <= 3 ? '比较规律' : basePrediction.cycleVariance <= 10 ? '有些波动' : '波动较大';
    const overview = await this.buildOverview(profile);
    const aiInsight = await this.generateAndStoreAiInsight(profile, overview);
    const localSymptomTrends = this.buildLocalSymptomTrends(
      await this.prisma.menstrualDailyLog.findMany({
        where: { profileId: profile.id },
        orderBy: { recordDate: 'desc' },
        take: 90,
      }),
    );
    const symptomTrends = aiInsight.symptomTrends.length > 0 ? aiInsight.symptomTrends : localSymptomTrends;

    return {
      averageCycleLength: avgCycle,
      averagePeriodDuration: avgDuration,
      monthLabels: monthLabels.length ? monthLabels : ['1月', '2月', '3月', '4月', '5月', '6月'],
      cycleLengths: cycleLengths.length ? cycleLengths : [28, 28, 28, 28, 28, 28],
      durationLengths: durationLengths.length ? durationLengths : [5, 5, 5, 5, 5, 5],
      regularityLabel,
      cycleLengthInsight: {
        ...buildRangeInsight(avgCycle, 21, 35, '正常', '当前周期长度'),
        label: regularityLabel,
      },
      periodDurationInsight: buildRangeInsight(avgDuration, 3, 7, '健康', '经期天数'),
      regularityDescription: '根据最近周期记录估算，数据越完整，分析越准确。',
      symptomInsights: symptomTrends.map((item) => item.description),
      symptomTrends,
      aiAvailable: aiInsight.aiAvailable,
      aiSummary: aiInsight.reasonSummary,
      healthTips:
        aiInsight.healthTips.length > 0
          ? aiInsight.healthTips
          : ['保持规律作息和温和运动。', '经期前后注意保暖，减少生冷食物。', '如出现明显异常，请及时咨询专业医生。'],
    };
  }

  async getDailyRecordDraft(userId: bigint, date?: string) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    await this.ensureCanEdit(context, profile);
    const recordDate = parseDateOnly(date ?? toDateKey(new Date()));
    const log = await this.prisma.menstrualDailyLog.findUnique({
      where: { profileId_recordDate: { profileId: profile.id, recordDate } },
    });
    const cycle = await this.findCycleForDate(profile.id, recordDate);
    const activeCycle = await this.findActiveCycle(profile.id);
    const lastCompletedCycle = await this.findLastCompletedCycle(profile.id);
    const basePrediction = await this.buildBasePrediction(profile);
    return this.withRecordType(
      log ? this.toDailyRecord(log) : defaultDailyRecord(toDateKey(recordDate)),
      Boolean(cycle),
      cycle ? this.toSelectedDateCycle(cycle, recordDate) : null,
      this.buildStatusCard({
        recordDate,
        selectedCycle: cycle ? this.toSelectedDateCycle(cycle, recordDate) : null,
        activeCycle,
        lastCompletedCycle,
        basePrediction,
      }),
    );
  }

  async saveDailyRecord(userId: bigint, payload: DailyRecordPayload) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    await this.ensureCanEdit(context, profile);
    const recordDate = parseDateOnly(payload.recordDate);
    const today = parseDateOnly(toDateKey(new Date()));
    if (recordDate > today) {
      throw new BadRequestException('daily record date cannot be in the future');
    }
    const cycle = await this.findCycleForDate(profile.id, recordDate);

    const saved = await this.prisma.menstrualDailyLog.upsert({
      where: { profileId_recordDate: { profileId: profile.id, recordDate } },
      update: this.toLogData(payload, userId, cycle),
      create: {
        ...this.toLogData(payload, userId, cycle),
        profileId: profile.id,
        relationshipId: profile.relationshipId,
        recordDate,
        createdByUserId: userId,
      },
    });
    return this.withRecordType(
      this.toDailyRecord(saved),
      Boolean(cycle),
      cycle ? this.toSelectedDateCycle(cycle, recordDate) : null,
      this.buildStatusCard({
        recordDate,
        selectedCycle: cycle ? this.toSelectedDateCycle(cycle, recordDate) : null,
        activeCycle: await this.findActiveCycle(profile.id),
        lastCompletedCycle: await this.findLastCompletedCycle(profile.id),
        basePrediction: await this.buildBasePrediction(profile),
      }),
    );
  }

  async confirmPeriodStarted(userId: bigint, startDate: string) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    this.ensureFemaleOwner(context, profile);
    const startedOn = parseDateOnly(startDate);
    const today = parseDateOnly(toDateKey(new Date()));
    if (startedOn > today) {
      throw new BadRequestException('period start date cannot be in the future');
    }
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.menstrualCycle.findFirst({
        where: { profileId: profile.id, status: 'in_progress' },
      });
      const overlappingCycle = await tx.menstrualCycle.findFirst({
        where: {
          profileId: profile.id,
          id: existing ? { not: existing.id } : undefined,
          startedOn: { lte: startedOn },
          OR: [{ endedOn: null }, { endedOn: { gte: startedOn } }],
        },
      });
      if (overlappingCycle) {
        throw new BadRequestException('period start date overlaps existing cycle');
      }

      const previous = await tx.menstrualCycle.findFirst({
        where: {
          profileId: profile.id,
          id: existing ? { not: existing.id } : undefined,
          startedOn: { lt: startedOn },
        },
        orderBy: { startedOn: 'desc' },
      });
      if (previous?.endedOn && startedOn <= previous.endedOn) {
        throw new BadRequestException('period start date overlaps existing cycle');
      }

      if (existing) {
        if (previous) {
          await tx.menstrualCycle.update({
            where: { id: previous.id },
            data: { cycleLengthDays: Math.max(1, diffDays(startedOn, previous.startedOn)), updatedByUserId: userId },
          });
        }
        await tx.menstrualCycle.update({
          where: { id: existing.id },
          data: { startedOn, cycleLengthDays: null, updatedByUserId: userId },
        });
        return;
      }

      const newerCycle = await tx.menstrualCycle.findFirst({
        where: { profileId: profile.id, startedOn: { gte: startedOn } },
        orderBy: { startedOn: 'asc' },
      });
      if (newerCycle) {
        throw new BadRequestException('period start date must be after existing cycles');
      }
      if (previous) {
        await tx.menstrualCycle.update({
          where: { id: previous.id },
          data: { cycleLengthDays: Math.max(1, diffDays(startedOn, previous.startedOn)), updatedByUserId: userId },
        });
      }
      await tx.menstrualCycle.create({
        data: {
          profileId: profile.id,
          relationshipId: profile.relationshipId,
          femaleUserId: profile.femaleUserId,
          startedOn,
          status: 'in_progress',
          cycleLengthDays: null,
          createdByUserId: userId,
          updatedByUserId: userId,
        },
      });
    });
    return this.getOverview(userId);
  }

  async confirmPeriodEnded(userId: bigint, endDate: string) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    this.ensureFemaleOwner(context, profile);
    const endedOn = parseDateOnly(endDate);
    await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.menstrualCycle.findFirst({
        where: { profileId: profile.id, status: 'in_progress' },
      });
      if (!cycle) {
        throw new BadRequestException('current period cycle not found');
      }
      if (endedOn < cycle.startedOn) {
        throw new BadRequestException('period end date cannot be before start date');
      }
      const overlappingCycle = await tx.menstrualCycle.findFirst({
        where: {
          profileId: profile.id,
          id: { not: cycle.id },
          startedOn: { lte: endedOn },
          OR: [{ endedOn: null }, { endedOn: { gte: cycle.startedOn } }],
        },
      });
      if (overlappingCycle) {
        throw new BadRequestException('period range overlaps existing cycle');
      }
      const periodLengthDays = Math.max(1, diffDays(endedOn, cycle.startedOn) + 1);
      await tx.menstrualCycle.update({
        where: { id: cycle.id },
        data: { endedOn, periodLengthDays, status: 'completed', updatedByUserId: userId },
      });
    });
    return this.getOverview(userId);
  }

  async saveInitialCycles(
    userId: bigint,
    payload: {
      cycles?: Array<{ startedOn?: string; endedOn?: string }>;
    },
  ) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    if (profile.femaleUserId !== userId) {
      throw new ForbiddenException('only female user can initialize period cycles');
    }

    const [existingCycleCount, existingDailyLogCount] = await Promise.all([
      this.prisma.menstrualCycle.count({ where: { profileId: profile.id } }),
      this.prisma.menstrualDailyLog.count({ where: { profileId: profile.id } }),
    ]);

    if (existingCycleCount > 0 || existingDailyLogCount > 0) {
      throw new BadRequestException('initial cycles can only be saved before period records exist');
    }

    const cycles = payload.cycles ?? [];
    if (cycles.length < 3) {
      throw new BadRequestException('three cycles are required');
    }

    const normalizedCycles = cycles
      .slice(0, 3)
      .map((cycle) => ({
        startedOn: parseDateOnly(cycle.startedOn ?? ''),
        endedOn: parseDateOnly(cycle.endedOn ?? ''),
      }))
      .sort((a, b) => a.startedOn.getTime() - b.startedOn.getTime());

    for (const cycle of normalizedCycles) {
      if (cycle.endedOn < cycle.startedOn) {
        throw new BadRequestException('cycle end date must be after start date');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.menstrualDailyLog.deleteMany({ where: { profileId: profile.id } });
      await tx.menstrualCycle.deleteMany({ where: { profileId: profile.id } });

      for (let index = 0; index < normalizedCycles.length; index += 1) {
        const cycle = normalizedCycles[index];
        const nextCycle = normalizedCycles[index + 1];
        await tx.menstrualCycle.create({
          data: {
            profileId: profile.id,
            relationshipId: profile.relationshipId,
            femaleUserId: profile.femaleUserId,
            startedOn: cycle.startedOn,
            endedOn: cycle.endedOn,
            periodLengthDays: diffDays(cycle.endedOn, cycle.startedOn) + 1,
            cycleLengthDays: nextCycle ? diffDays(nextCycle.startedOn, cycle.startedOn) : null,
            status: 'completed',
            createdByUserId: userId,
            updatedByUserId: userId,
          },
        });
      }
    });

    return this.getOverview(userId);
  }

  async updateRecordingMode(userId: bigint, mode: 'auto' | 'manual') {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    this.ensureFemaleOwner(context, profile);
    await this.prisma.menstrualProfile.update({
      where: { id: profile.id },
      data: { referenceOnlyFlag: mode === 'manual' },
    });
    return this.getOverview(userId);
  }

  async updateCurrentCycleStartDate(userId: bigint, startDate: string) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    this.ensureFemaleOwner(context, profile);
    const startedOn = parseDateOnly(startDate);
    const today = parseDateOnly(toDateKey(new Date()));
    if (startedOn > today) {
      throw new BadRequestException('period start date cannot be in the future');
    }
    await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.menstrualCycle.findFirst({
        where: { profileId: profile.id, status: 'in_progress' },
      });
      if (!cycle) {
        throw new BadRequestException('current period cycle not found');
      }
      const overlappingCycle = await tx.menstrualCycle.findFirst({
        where: {
          profileId: profile.id,
          id: { not: cycle.id },
          startedOn: { lte: startedOn },
          OR: [{ endedOn: null }, { endedOn: { gte: startedOn } }],
        },
      });
      if (overlappingCycle) {
        throw new BadRequestException('period start date overlaps existing cycle');
      }
      const previous = await tx.menstrualCycle.findFirst({
        where: { profileId: profile.id, id: { not: cycle.id }, startedOn: { lt: startedOn } },
        orderBy: { startedOn: 'desc' },
      });
      if (previous?.endedOn && startedOn <= previous.endedOn) {
        throw new BadRequestException('period start date overlaps existing cycle');
      }
      if (previous) {
        await tx.menstrualCycle.update({
          where: { id: previous.id },
          data: { cycleLengthDays: Math.max(1, diffDays(startedOn, previous.startedOn)), updatedByUserId: userId },
        });
      }
      await tx.menstrualCycle.update({
        where: { id: cycle.id },
        data: { startedOn, cycleLengthDays: null, updatedByUserId: userId },
      });
    });
    return {
      overview: await this.getOverview(userId),
      draft: await this.getDailyRecordDraft(userId, startDate),
    };
  }

  async clearCurrentCycleRecords(userId: bigint) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    this.ensureFemaleOwner(context, profile);
    const cycle = await this.prisma.menstrualCycle.findFirst({
      where: { profileId: profile.id, status: 'in_progress' },
    });
    if (cycle) {
      await this.prisma.menstrualDailyLog.deleteMany({ where: { cycleId: cycle.id } });
    }
    return {
      overview: await this.getOverview(userId),
      draft: await this.getDailyRecordDraft(userId, cycle ? toDateKey(cycle.startedOn) : undefined),
    };
  }

  async getHistoryCycle(userId: bigint, date: string) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    await this.ensureCanEdit(context, profile);
    const recordDate = parseDateOnly(date);
    const cycle = await this.prisma.menstrualCycle.findFirst({
      where: {
        profileId: profile.id,
        status: 'completed',
        startedOn: { lte: recordDate },
        endedOn: { gte: recordDate },
      },
      orderBy: [{ startedOn: 'desc' }, { id: 'desc' }],
    });
    if (!cycle || !cycle.endedOn) {
      throw new BadRequestException('history cycle not found');
    }
    return this.toHistoryCycle(profile.id, cycle, recordDate);
  }

  async previewHistoryCycleAdjustment(
    userId: bigint,
    payload: {
      cycleId?: string;
      startedOn?: string;
      endedOn?: string;
    },
  ) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    await this.ensureCanEdit(context, profile);
    const cycleId = BigInt(payload.cycleId ?? '0');
    const startedOn = parseDateOnly(payload.startedOn ?? '');
    const endedOn = parseDateOnly(payload.endedOn ?? '');
    await this.validateHistoryCycleAdjustment(profile.id, cycleId, startedOn, endedOn);
    return this.buildHistoryCycleAdjustmentPreview(profile.id, cycleId, startedOn, endedOn);
  }

  async updateHistoryCycle(
    userId: bigint,
    payload: {
      cycleId?: string;
      startedOn?: string;
      endedOn?: string;
      cycleDayStrategy?: 'recalculate' | 'preserve';
    },
  ) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    this.ensureFemaleOwner(context, profile);
    const cycleId = BigInt(payload.cycleId ?? '0');
    const startedOn = parseDateOnly(payload.startedOn ?? '');
    const endedOn = parseDateOnly(payload.endedOn ?? '');
    const strategy = payload.cycleDayStrategy === 'preserve' ? 'preserve' : 'recalculate';
    await this.validateHistoryCycleAdjustment(profile.id, cycleId, startedOn, endedOn);

    await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.menstrualCycle.findFirst({
        where: { id: cycleId, profileId: profile.id, status: 'completed' },
      });
      if (!cycle) {
        throw new BadRequestException('history cycle not found');
      }
      await this.validateHistoryCycleAdjustment(profile.id, cycle.id, startedOn, endedOn, tx);

      await tx.menstrualCycle.update({
        where: { id: cycle.id },
        data: {
          startedOn,
          endedOn,
          periodLengthDays: diffDays(endedOn, startedOn) + 1,
          updatedByUserId: userId,
        },
      });
      await tx.menstrualDailyLog.updateMany({
        where: {
          profileId: profile.id,
          cycleId: cycle.id,
          OR: [{ recordDate: { lt: startedOn } }, { recordDate: { gt: endedOn } }],
        },
        data: {
          cycleId: null,
          cycleDaySnapshot: null,
          cycleDaySource: null,
          cycleDayLocked: false,
          updatedByUserId: userId,
        },
      });
      const logsInRange = await tx.menstrualDailyLog.findMany({
        where: { profileId: profile.id, recordDate: { gte: startedOn, lte: endedOn } },
      });
      for (const log of logsInRange) {
        const newCycleDay = diffDays(log.recordDate, startedOn) + 1;
        const preserveSnapshot =
          strategy === 'preserve' && log.cycleId === cycle.id && typeof log.cycleDaySnapshot === 'number';
        await tx.menstrualDailyLog.update({
          where: { id: log.id },
          data: {
            cycleId: cycle.id,
            cycleDaySnapshot: preserveSnapshot ? log.cycleDaySnapshot : newCycleDay,
            cycleDaySource: preserveSnapshot ? 'user_confirmed' : 'adjusted',
            cycleDayLocked: preserveSnapshot,
            updatedByUserId: userId,
          },
        });
      }
      await this.recalculateCycleLengths(tx, profile.id, userId);
    });

    const updatedCycle = await this.prisma.menstrualCycle.findUnique({ where: { id: cycleId } });
    if (!updatedCycle || !updatedCycle.endedOn) {
      throw new BadRequestException('history cycle not found');
    }
    return this.toHistoryCycle(profile.id, updatedCycle, startedOn);
  }

  async getReminderSettings(userId: bigint) {
    const context = await this.getContext(userId);
    const settings = await this.prisma.menstrualReminderSetting.upsert({
      where: { relationshipId: context.relationship.id },
      update: {},
      create: { relationshipId: context.relationship.id },
    });
    return this.toReminderSettings(settings);
  }

  async updateReminderSettings(
    userId: bigint,
    payload: Partial<{
      periodStartReminderEnabled: boolean;
      periodStartReminderOffsetDays: number;
      periodDueReminderEnabled: boolean;
      periodEndReminderEnabled: boolean;
      sharedReminderEnabled: boolean;
      reminderHour: number;
      reminderMinute: number;
    }>,
  ) {
    const context = await this.getContext(userId);
    const reminderHour =
      typeof payload.reminderHour === 'number'
        ? Math.min(23, Math.max(0, Math.floor(payload.reminderHour)))
        : undefined;
    const reminderMinute =
      typeof payload.reminderMinute === 'number'
        ? Math.min(59, Math.max(0, Math.floor(payload.reminderMinute)))
        : undefined;
    const settings = await this.prisma.menstrualReminderSetting.upsert({
      where: { relationshipId: context.relationship.id },
      update: {
        periodStartReminderEnabled: payload.periodStartReminderEnabled,
        periodStartReminderOffsetDays: payload.periodStartReminderOffsetDays,
        periodDueReminderEnabled: payload.periodDueReminderEnabled,
        periodEndReminderEnabled: payload.periodEndReminderEnabled,
        sharedReminderEnabled: payload.sharedReminderEnabled,
        reminderHour,
        reminderMinute,
      },
      create: {
        relationshipId: context.relationship.id,
        periodStartReminderEnabled: payload.periodStartReminderEnabled,
        periodStartReminderOffsetDays: payload.periodStartReminderOffsetDays,
        periodDueReminderEnabled: payload.periodDueReminderEnabled,
        periodEndReminderEnabled: payload.periodEndReminderEnabled,
        sharedReminderEnabled: payload.sharedReminderEnabled,
        reminderHour,
        reminderMinute,
      },
    });
    return this.toReminderSettings(settings);
  }

  async updatePermissions(
    userId: bigint,
    payload: {
      maleViewEnabled?: boolean;
      maleEditEnabled?: boolean;
    },
  ) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    if (profile.femaleUserId !== userId) {
      throw new ForbiddenException('only female user can update period permissions');
    }
    const editEnabled = Boolean(payload.maleEditEnabled);
    const viewEnabled = Boolean(payload.maleViewEnabled || editEnabled);
    const wasGranted = profile.maleAccessGranted;
    const willGrant = viewEnabled;
    const updatedProfile = await this.prisma.menstrualProfile.update({
      where: { id: profile.id },
      data: {
        maleAccessGranted: willGrant,
        maleViewEnabled: viewEnabled,
        maleEditEnabled: editEnabled,
        grantedAt: willGrant && !wasGranted ? new Date() : profile.grantedAt,
        revokedAt: willGrant ? null : new Date(),
      },
    });
    return this.toPermissions(context, updatedProfile);
  }

  async getPermissions(userId: bigint) {
    const context = await this.getContext(userId);
    const profile = await this.ensureProfile(context);
    return this.toPermissions(context, profile);
  }

  private async generateAndStoreAiInsight(
    profile: MenstrualProfile,
    overview: Awaited<ReturnType<PeriodService['buildOverview']>>,
  ) {
    const today = parseDateOnly(toDateKey(new Date()));
    const basePrediction = await this.buildBasePrediction(profile);
    const nextPeriodStart = basePrediction.predictedPeriodStartDate;
    const nextPeriodEnd = basePrediction.predictedPeriodEndDate;
    const ovulationDate = basePrediction.predictedOvulationDate;
    const logs = await this.prisma.menstrualDailyLog.findMany({
      where: { profileId: profile.id, recordDate: { gte: addDays(today, -180) } },
      orderBy: { recordDate: 'desc' },
      take: 120,
    });
    const last30Logs = logs.filter((log) => diffDays(today, log.recordDate) <= 30);
    const last60Logs = logs.filter((log) => diffDays(today, log.recordDate) <= 60);
    const input = {
      userId: profile.femaleUserId.toString(),
      today: toDateKey(today),
      cycleRecordCount: basePrediction.validCycles.length,
      recentCycleLengths: basePrediction.recentCycleLengths,
      recentPeriodLengths: basePrediction.recentPeriodLengths,
      baseCycleLengthDays: basePrediction.baseCycleLengthDays,
      basePeriodLengthDays: basePrediction.basePeriodLengthDays,
      basePredictedPeriodStartDate: toDateKey(nextPeriodStart),
      basePredictedPeriodEndDate: toDateKey(nextPeriodEnd),
      basePredictedOvulationDate: toDateKey(ovulationDate),
      basePredictedOvulationWindowStart: toDateKey(basePrediction.predictedOvulationWindowStart),
      basePredictedOvulationWindowEnd: toDateKey(basePrediction.predictedOvulationWindowEnd),
      baseCurrentCyclePhase: basePrediction.currentCyclePhase,
      cycleVariance: basePrediction.cycleVariance,
      periodVariance: basePrediction.periodVariance,
      last30DaySymptomSummary: summarizeLogs(last30Logs),
      last60DayPatternSummary: summarizeLogs(last60Logs),
      missingDataFlag: basePrediction.missingDataFlag,
      cycles: basePrediction.allCycles.map((cycle) => ({
        startedOn: toDateKey(cycle.startedOn),
        endedOn: cycle.endedOn ? toDateKey(cycle.endedOn) : null,
        cycleLengthDays: cycle.cycleLengthDays,
        periodLengthDays: cycle.periodLengthDays,
        status: cycle.status,
      })),
      dailyLogs: logs.map((log) => {
        const note = parseNotePayload(log.noteText);
        return {
          recordDate: toDateKey(log.recordDate),
          mood: log.moodState,
          painLevel: log.painLevel,
          flow: log.flowLevel,
          bloodColor: log.bloodColor,
          bloodClotFlag: log.bloodClotFlag,
          dischargeType: log.dischargeType,
          abdomenPainArea: log.abdomenPainArea,
          backPainLevel: log.backPainLevel,
          breastTendernessLevel: log.breastTendernessLevel,
          bodyTemperature: log.bodyTemperature?.toString() ?? null,
          sleepQuality: log.sleepQuality,
          dietStatus: log.dietStatus,
          exerciseLevel: log.exerciseLevel,
          stressLevel: log.stressLevel,
          weightChangeValue: log.weightChangeValue?.toString() ?? null,
          symptoms: note.symptoms,
          abnormalEvent: log.abnormalEventText,
          manualNoteText: note.note,
        };
      }),
    };
    const insight = this.applyAiBoundaries(await this.periodAiService.generateInsight(input), basePrediction);
    const adjustedStart = insight.adjustedPeriodStartDate ? parseDateOnly(insight.adjustedPeriodStartDate) : null;
    const adjustedEnd = insight.adjustedPeriodEndDate ? parseDateOnly(insight.adjustedPeriodEndDate) : null;
    const adjustedOvulation = insight.adjustedOvulationDate ? parseDateOnly(insight.adjustedOvulationDate) : null;
    const adjustedOvulationStart = insight.adjustedOvulationWindowStart
      ? parseDateOnly(insight.adjustedOvulationWindowStart)
      : null;
    const adjustedOvulationEnd = insight.adjustedOvulationWindowEnd
      ? parseDateOnly(insight.adjustedOvulationWindowEnd)
      : null;

    await this.prisma.menstrualPredictionResult.create({
      data: {
        profileId: profile.id,
        relationshipId: profile.relationshipId,
        baseCycleLengthDays: basePrediction.baseCycleLengthDays,
        basePeriodLengthDays: basePrediction.basePeriodLengthDays,
        basePredictedPeriodStartDate: nextPeriodStart,
        basePredictedPeriodEndDate: nextPeriodEnd,
        basePredictedOvulationDate: ovulationDate,
        basePredictedOvulationWindowStart: basePrediction.predictedOvulationWindowStart,
        basePredictedOvulationWindowEnd: basePrediction.predictedOvulationWindowEnd,
        baseCurrentCyclePhase: basePrediction.currentCyclePhase,
        aiAdjustedPeriodStartDate: adjustedStart,
        aiAdjustedPeriodEndDate: adjustedEnd,
        aiAdjustedOvulationDate: adjustedOvulation,
        aiAdjustedOvulationWindowStart: adjustedOvulationStart,
        aiAdjustedOvulationWindowEnd: adjustedOvulationEnd,
        aiAdjustedCurrentCyclePhase: insight.adjustedCurrentCyclePhase,
        adjustmentDaysForPeriodStart: adjustedStart ? diffDays(adjustedStart, nextPeriodStart) : null,
        adjustmentDaysForPeriodEnd: adjustedEnd ? diffDays(adjustedEnd, nextPeriodEnd) : null,
        adjustmentDaysForOvulation: adjustedOvulation ? diffDays(adjustedOvulation, ovulationDate) : null,
        confidenceScore: insight.confidenceScore ?? basePrediction.confidenceScore,
        confidenceLevel: insight.confidenceLevel,
        adjustmentReasonSummary: insight.reasonSummary,
        referenceOnlyFlag:
          basePrediction.referenceOnlyFlag || profile.referenceOnlyFlag || insight.confidenceLevel === 'low',
        aiAvailableFlag: insight.aiAvailable,
      },
    });

    if (insight.aiAvailable && insight.adjustedCurrentCyclePhase) {
      await this.prisma.menstrualProfile.update({
        where: { id: profile.id },
        data: {
          referenceOnlyFlag:
            basePrediction.referenceOnlyFlag || profile.referenceOnlyFlag || insight.confidenceLevel === 'low',
        },
      });
    }

    return {
      ...insight,
      symptomTrends: insight.symptomTrends.length > 0 ? insight.symptomTrends : this.buildLocalSymptomTrends(logs),
    };
  }

  private buildLocalSymptomTrends(logs: MenstrualDailyLog[]): PeriodAiSymptomTrend[] {
    const counters = new Map<string, PeriodAiSymptomTrend>();
    const bump = (key: string, title: string, description: string, kind: PeriodAiSymptomTrend['kind']) => {
      const existing = counters.get(key);
      if (existing) {
        existing.count += 1;
        return;
      }
      counters.set(key, { title, description, kind, count: 1 });
    };

    for (const log of logs) {
      if (log.dietStatus && log.dietStatus !== '正常') {
        bump('diet', log.dietStatus, '最近记录里饮食状态变化出现较多，可以继续观察与周期阶段的关系。', 'diet');
      }
      if (log.sleepQuality === '差') {
        bump('sleep', '睡眠变差', '最近有睡眠质量下降记录，建议同步记录压力和疼痛，方便后续判断诱因。', 'sleep');
      }
      if ((log.painLevel ?? 0) >= 4 || (log.backPainLevel ?? 0) >= 4 || (log.breastTendernessLevel ?? 0) >= 4) {
        bump('pain', '疼痛明显', '最近疼痛评分偏高，若持续加重或影响生活，建议咨询专业医生。', 'pain');
      }
      if ((log.stressLevel ?? 0) >= 4 || log.moodState === '烦躁' || log.moodState === '低落') {
        bump('mood', '情绪波动', '最近情绪或压力记录有波动，可以结合睡眠、运动一起观察。', 'mood');
      }
      for (const symptom of parseNotePayload(log.noteText).symptoms) {
        bump(
          `symptom:${symptom}`,
          symptom,
          `${symptom} 在最近记录中多次出现，后续记录越完整，趋势会越准确。`,
          'symptom',
        );
      }
    }

    const trends = Array.from(counters.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return trends.length > 0
      ? trends
      : [
          {
            title: '记录不足',
            description: '现在还没有足够的每日记录形成症状趋势，连续记录后会自动分析变化。',
            kind: 'general',
            count: 0,
          },
        ];
  }

  private async buildBasePrediction(profile: MenstrualProfile): Promise<BasePrediction> {
    const cycles = await this.prisma.menstrualCycle.findMany({
      where: { profileId: profile.id, status: { in: ['completed', 'in_progress'] } },
      orderBy: { startedOn: 'desc' },
      take: 6,
    });
    const cyclesAsc = [...cycles].sort((a, b) => a.startedOn.getTime() - b.startedOn.getTime());
    const normalizedCyclesAsc = cyclesAsc.map((cycle, index) => {
      const nextCycle = cyclesAsc[index + 1];
      const periodLengthDays = cycle.endedOn ? diffDays(cycle.endedOn, cycle.startedOn) + 1 : cycle.periodLengthDays;
      const cycleLengthDays = nextCycle ? diffDays(nextCycle.startedOn, cycle.startedOn) : null;
      return {
        startedOn: cycle.startedOn,
        endedOn: cycle.endedOn,
        cycleLengthDays,
        periodLengthDays,
        status: cycle.status,
      };
    });
    const normalizedCycles = [...normalizedCyclesAsc].reverse();
    const validCycles = normalizedCycles.filter((cycle) => {
      const validCycle =
        cycle.cycleLengthDays === null ||
        (cycle.cycleLengthDays >= MIN_VALID_CYCLE_DAYS && cycle.cycleLengthDays <= MAX_VALID_CYCLE_DAYS);
      const validPeriod =
        cycle.periodLengthDays === null ||
        (cycle.periodLengthDays >= MIN_VALID_PERIOD_DAYS && cycle.periodLengthDays <= MAX_VALID_PERIOD_DAYS);
      return validCycle && validPeriod;
    });
    const recentCycleLengths = validCycles.map((cycle) => cycle.cycleLengthDays).filter(isNumber);
    const recentPeriodLengths = validCycles.map((cycle) => cycle.periodLengthDays).filter(isNumber);
    const baseCycleLengthDays = weightedAverage(recentCycleLengths, 28);
    const basePeriodLengthDays = weightedAverage(recentPeriodLengths, 5);
    const latestCycle = validCycles[0] ?? normalizedCycles[0];
    const today = parseDateOnly(toDateKey(new Date()));
    const predictedPeriodStartDate = latestCycle ? addDays(latestCycle.startedOn, baseCycleLengthDays) : today;
    const predictedPeriodEndDate = addDays(predictedPeriodStartDate, basePeriodLengthDays - 1);
    const predictedOvulationDate = addDays(predictedPeriodStartDate, -14);
    const predictedOvulationWindowStart = addDays(predictedOvulationDate, -2);
    const predictedOvulationWindowEnd = addDays(predictedOvulationDate, 2);
    const cycleVariance = varianceRange(recentCycleLengths);
    const periodVariance = varianceRange(recentPeriodLengths);
    const missingDataFlag = validCycles.length < 3 || recentCycleLengths.length < 3 || recentPeriodLengths.length < 3;
    const abnormalCycleCount = normalizedCycles.length - validCycles.length;
    const confidenceLevel =
      validCycles.length >= 6 && cycleVariance <= 3 && periodVariance <= 2 && abnormalCycleCount === 0
        ? 'high'
        : validCycles.length >= 3 && abnormalCycleCount <= 1
          ? 'medium'
          : 'low';

    return {
      validCycles,
      allCycles: normalizedCycles,
      recentCycleLengths,
      recentPeriodLengths,
      baseCycleLengthDays,
      basePeriodLengthDays,
      predictedPeriodStartDate,
      predictedPeriodEndDate,
      predictedOvulationDate,
      predictedOvulationWindowStart,
      predictedOvulationWindowEnd,
      currentCyclePhase: getPhaseByDates(
        today,
        predictedPeriodStartDate,
        predictedPeriodEndDate,
        predictedOvulationWindowStart,
        predictedOvulationWindowEnd,
      ),
      cycleVariance,
      periodVariance,
      confidenceLevel,
      confidenceScore: confidenceLevelToScore(confidenceLevel),
      referenceOnlyFlag: confidenceLevel === 'low' || missingDataFlag,
      missingDataFlag,
      abnormalCycleCount,
    };
  }

  private applyAiBoundaries(insight: PeriodAiInsight, basePrediction: BasePrediction): PeriodAiInsight {
    const maxStartShift = basePrediction.confidenceLevel === 'low' ? 1 : 3;
    const maxEndShift = basePrediction.confidenceLevel === 'low' ? 1 : 2;
    const maxOvulationShift = basePrediction.confidenceLevel === 'low' ? 1 : 2;
    const adjustedStart = clampAiDate(
      insight.adjustedPeriodStartDate,
      basePrediction.predictedPeriodStartDate,
      maxStartShift,
    );
    const adjustedEnd = clampAiDate(insight.adjustedPeriodEndDate, basePrediction.predictedPeriodEndDate, maxEndShift);
    const adjustedOvulation = clampAiDate(
      insight.adjustedOvulationDate,
      basePrediction.predictedOvulationDate,
      maxOvulationShift,
    );
    const confidenceLevel = !insight.aiAvailable
      ? basePrediction.confidenceLevel
      : basePrediction.confidenceLevel === 'low'
        ? 'low'
        : insight.confidenceLevel;

    return {
      ...insight,
      adjustedPeriodStartDate: adjustedStart ? toDateKey(adjustedStart) : null,
      adjustedPeriodEndDate: adjustedEnd ? toDateKey(adjustedEnd) : null,
      adjustedOvulationDate: adjustedOvulation ? toDateKey(adjustedOvulation) : null,
      adjustedOvulationWindowStart: adjustedOvulation ? toDateKey(addDays(adjustedOvulation, -2)) : null,
      adjustedOvulationWindowEnd: adjustedOvulation ? toDateKey(addDays(adjustedOvulation, 2)) : null,
      adjustedCurrentCyclePhase: insight.aiAvailable ? insight.adjustedCurrentCyclePhase : null,
      confidenceLevel,
      confidenceScore:
        insight.aiAvailable && confidenceLevel === 'low'
          ? Math.min(insight.confidenceScore ?? basePrediction.confidenceScore, 0.69)
          : (insight.confidenceScore ?? basePrediction.confidenceScore),
      reasonSummary: insight.reasonSummary || 'AI unavailable, fallback to base prediction',
    };
  }

  private async buildOverview(profile: MenstrualProfile) {
    const cycle = await this.prisma.menstrualCycle.findFirst({
      where: { profileId: profile.id, status: 'in_progress' },
      orderBy: { startedOn: 'desc' },
    });
    const lastCompletedCycle = await this.prisma.menstrualCycle.findFirst({
      where: { profileId: profile.id, status: 'completed' },
      orderBy: { startedOn: 'desc' },
    });
    const basePrediction = await this.buildBasePrediction(profile);
    const cycles = basePrediction.allCycles;
    const cycleLength = basePrediction.baseCycleLengthDays;
    const periodDuration = basePrediction.basePeriodLengthDays;
    const today = parseDateOnly(toDateKey(new Date()));
    const nextPeriodStart = basePrediction.predictedPeriodStartDate;
    const daysUntilPeriod = Math.max(0, diffDays(nextPeriodStart, today));
    const cycleDay = cycle
      ? Math.max(1, diffDays(today, cycle.startedOn) + 1)
      : Math.max(1, cycleLength - daysUntilPeriod + 1);
    const currentPhaseKey = cycle ? 'period' : basePrediction.currentCyclePhase;
    const logs = cycle
      ? await this.prisma.menstrualDailyLog.findMany({ where: { cycleId: cycle.id }, orderBy: { recordDate: 'asc' } })
      : [];
    const todayLog = await this.prisma.menstrualDailyLog.findUnique({
      where: { profileId_recordDate: { profileId: profile.id, recordDate: today } },
    });
    const ovulationDate = addDays(nextPeriodStart, -14);

    return {
      appName: '经期助手',
      currentPhaseLabel: phaseLabel(currentPhaseKey),
      currentPhaseKey,
      cycleDay,
      cycleLength,
      periodDuration,
      daysUntilPeriod,
      nextPeriodDateLabel: formatCnDateLabel(nextPeriodStart),
      ovulationRangeLabel: `${formatCnDateLabel(addDays(ovulationDate, -2))} - ${formatCnDateLabel(addDays(ovulationDate, 2))}`,
      ovulationHint: '系统会根据你的周期记录持续修正排卵期预测。',
      mood: todayLog?.moodState ?? '平静',
      moodNote: todayLog?.noteText ?? '今天还没有记录状态。',
      summary: cycle ? `当前是经期第 ${cycleDay} 天。` : `距离下次预计经期还有 ${daysUntilPeriod} 天。`,
      isPeriodConfirmed: Boolean(cycle),
      actualPeriodStartDate: cycle ? toDateKey(cycle.startedOn) : null,
      actualPeriodEndDate: cycle?.endedOn ? toDateKey(cycle.endedOn) : null,
      lastCompletedPeriodEndDate: lastCompletedCycle?.endedOn ? toDateKey(lastCompletedCycle.endedOn) : null,
      hasTodayRecord: Boolean(todayLog),
      isPredictionReachedButUnconfirmed: !cycle && daysUntilPeriod === 0,
      overdueDays: !cycle && diffDays(today, nextPeriodStart) > 0 ? diffDays(today, nextPeriodStart) : 0,
      maleAccessGranted: profile.maleAccessGranted,
      maleViewEnabled: profile.maleViewEnabled,
      maleEditEnabled: profile.maleEditEnabled,
      recordingMode: profile.referenceOnlyFlag ? 'manual' : 'auto',
      currentCycleRecordedDates: logs.map((item) => toDateKey(item.recordDate)),
      needsInitialCycles: cycles.length === 0,
    };
  }

  private buildRestrictedOverview(profile: MenstrualProfile) {
    return {
      appName: '经期助手',
      currentPhaseLabel: '等待授权',
      currentPhaseKey: 'luteal',
      cycleDay: 0,
      cycleLength: 28,
      periodDuration: 5,
      daysUntilPeriod: 0,
      nextPeriodDateLabel: '',
      ovulationRangeLabel: '',
      ovulationHint: '对方授权后才会展示周期预测。',
      mood: '',
      moodNote: '',
      summary: '对方还没有授权查看经期状态。',
      isPeriodConfirmed: false,
      actualPeriodStartDate: null,
      actualPeriodEndDate: null,
      lastCompletedPeriodEndDate: null,
      hasTodayRecord: false,
      isPredictionReachedButUnconfirmed: false,
      overdueDays: 0,
      maleAccessGranted: profile.maleAccessGranted,
      maleViewEnabled: profile.maleViewEnabled,
      maleEditEnabled: profile.maleEditEnabled,
      recordingMode: profile.referenceOnlyFlag ? 'manual' : 'auto',
      currentCycleRecordedDates: [],
      needsInitialCycles: false,
    };
  }

  private async buildPredictedPhaseMarkers(
    profile: MenstrualProfile,
    year: number,
    month: number,
    overview: Awaited<ReturnType<PeriodService['buildOverview']>>,
  ) {
    const today = parseDateOnly(toDateKey(new Date()));
    const sixMonthsLater = addMonths(today, 6);
    const monthStart = parseDateOnly(`${year}-${String(month).padStart(2, '0')}-01`);
    const monthEnd = addDays(addMonths(monthStart, 1), -1);

    if (monthStart > sixMonthsLater || monthEnd < today) {
      return [];
    }

    const monthRangeStart = monthStart < today ? today : monthStart;
    const monthRangeEnd = monthEnd > sixMonthsLater ? sixMonthsLater : monthEnd;
    const basePrediction = await this.buildBasePrediction(profile);
    const cycleLength = basePrediction.baseCycleLengthDays;
    const periodDuration = basePrediction.basePeriodLengthDays;
    const latestCycle = basePrediction.validCycles[0] ?? basePrediction.allCycles[0];
    const latestCycleStartedOn = latestCycle?.startedOn ?? null;
    let predictedPeriodStart = latestCycle
      ? addDays(latestCycle.startedOn, cycleLength)
      : basePrediction.predictedPeriodStartDate;

    while (predictedPeriodStart < addDays(monthRangeStart, -cycleLength)) {
      predictedPeriodStart = addDays(predictedPeriodStart, cycleLength);
    }

    const markers: Array<{ date: Date; type: string }> = [];
    const pushRange = (start: Date, end: Date, type: string) => {
      for (let date = start; date <= end; date = addDays(date, 1)) {
        if (date >= monthRangeStart && date <= monthRangeEnd) {
          markers.push({ date, type });
        }
      }
    };

    const firstCycleStart = addDays(predictedPeriodStart, -cycleLength);
    for (
      let cycleStart = firstCycleStart;
      cycleStart <= addDays(monthRangeEnd, cycleLength);
      cycleStart = addDays(cycleStart, cycleLength)
    ) {
      const nextCycleStart = addDays(cycleStart, cycleLength);
      const isLatestKnownCycle = latestCycleStartedOn ? sameDate(cycleStart, latestCycleStartedOn) : false;
      const periodStart = cycleStart;
      const periodEnd =
        isLatestKnownCycle && latestCycle?.endedOn ? latestCycle.endedOn : addDays(periodStart, periodDuration - 1);
      const ovulationDate = addDays(nextCycleStart, -14);
      const ovulationStart = addDays(ovulationDate, -2);
      const ovulationEnd = addDays(ovulationDate, 2);
      const follicularStart = addDays(periodEnd, 1);
      const follicularEnd = addDays(ovulationStart, -1);
      const lutealStart = addDays(ovulationEnd, 1);
      const lutealEnd = addDays(nextCycleStart, -1);

      if (!isLatestKnownCycle) {
        pushRange(periodStart, periodEnd, 'predicted_period');
      }
      pushRange(follicularStart, follicularEnd, 'follicular');
      pushRange(ovulationStart, ovulationEnd, 'ovulation_range');
      pushRange(lutealStart, lutealEnd, 'luteal');
    }

    return markers;
  }

  private toDailyRecord(log: MenstrualDailyLog): DailyRecordPayload {
    const parsedNote = parseNotePayload(log.noteText);
    return {
      ...defaultDailyRecord(toDateKey(log.recordDate)),
      hasRecord: true,
      mood: log.moodState ?? '平静',
      flow: log.flowLevel ?? '中等',
      painLevel: log.painLevel ?? 0,
      bloodColor: log.bloodColor ?? '鲜红',
      bloodClot: Boolean(log.bloodClotFlag),
      dischargeType: log.dischargeType ?? '无明显变化',
      abdomenPainArea: log.abdomenPainArea ?? '无腹痛',
      backPainLevel: log.backPainLevel ?? 0,
      breastTendernessLevel: log.breastTendernessLevel ?? 0,
      skinStatus: log.skinStatus ?? '稳定',
      sleepQuality: log.sleepQuality ?? '一般',
      stressLevel: log.stressLevel ?? 0,
      dietStatus: log.dietStatus ?? '正常',
      exerciseLevel: log.exerciseLevel ?? '低',
      weightKg: log.weightChangeValue?.toString() ?? '',
      temperature: log.bodyTemperature?.toString() ?? '',
      abnormalEvent: log.abnormalEventText ?? '',
      note: parsedNote.note,
      symptoms: parsedNote.symptoms,
      cycleDaySnapshot: log.cycleDaySnapshot,
      cycleDaySource:
        log.cycleDaySource === 'auto' || log.cycleDaySource === 'user_confirmed' || log.cycleDaySource === 'adjusted'
          ? log.cycleDaySource
          : null,
      cycleDayLocked: log.cycleDayLocked,
    };
  }

  private withRecordType(
    record: DailyRecordPayload,
    isPeriodDay: boolean,
    selectedDateCycle: SelectedDateCycleDto | null = null,
    statusCard: StatusCardDto = defaultDailyRecord(record.recordDate).statusCard!,
  ): DailyRecordPayload {
    return {
      ...record,
      isPeriodDay,
      selectedDateCycle,
      statusCard,
      calculatedCycleDay: selectedDateCycle
        ? diffDays(parseDateOnly(record.recordDate), parseDateOnly(selectedDateCycle.startedOn)) + 1
        : null,
      recordType: isPeriodDay ? 'period' : 'daily',
    };
  }

  private async isPeriodDay(profileId: bigint, recordDate: Date) {
    return Boolean(await this.findCycleForDate(profileId, recordDate));
  }

  private async findActiveCycle(profileId: bigint) {
    return this.prisma.menstrualCycle.findFirst({
      where: { profileId, status: 'in_progress' },
      orderBy: [{ startedOn: 'desc' }, { id: 'desc' }],
    });
  }

  private async findLastCompletedCycle(profileId: bigint) {
    return this.prisma.menstrualCycle.findFirst({
      where: { profileId, status: 'completed' },
      orderBy: [{ startedOn: 'desc' }, { id: 'desc' }],
    });
  }

  private async recalculateCycleLengths(tx: Prisma.TransactionClient, profileId: bigint, userId: bigint) {
    const cycles = await tx.menstrualCycle.findMany({
      where: { profileId, status: { in: ['completed', 'in_progress'] } },
      orderBy: [{ startedOn: 'asc' }, { id: 'asc' }],
    });
    for (let index = 0; index < cycles.length; index += 1) {
      const cycle = cycles[index];
      const nextCycle = cycles[index + 1];
      await tx.menstrualCycle.update({
        where: { id: cycle.id },
        data: {
          cycleLengthDays: nextCycle ? diffDays(nextCycle.startedOn, cycle.startedOn) : null,
          updatedByUserId: userId,
        },
      });
    }
  }

  private async toHistoryCycle(
    profileId: bigint,
    cycle: {
      id: bigint;
      startedOn: Date;
      endedOn: Date | null;
      periodLengthDays: number | null;
    },
    selectedDate: Date,
  ) {
    if (!cycle.endedOn) {
      throw new BadRequestException('history cycle end date not found');
    }
    const logs = await this.prisma.menstrualDailyLog.findMany({
      where: { profileId, recordDate: { gte: cycle.startedOn, lte: cycle.endedOn } },
      orderBy: { recordDate: 'asc' },
    });
    const startedOn = toDateKey(cycle.startedOn);
    const endedOn = toDateKey(cycle.endedOn);
    return {
      cycleId: cycle.id.toString(),
      startedOn,
      endedOn,
      periodLengthDays: cycle.periodLengthDays ?? diffDays(cycle.endedOn, cycle.startedOn) + 1,
      recordedDates: logs.map((log) => toDateKey(log.recordDate)),
      selectedDate: toDateKey(selectedDate),
      title: `${formatDateKeyCnLabel(startedOn)} - ${formatDateKeyCnLabel(endedOn)}`,
      description: `这次历史经期共 ${diffDays(cycle.endedOn, cycle.startedOn) + 1} 天。调整后，所选日期范围内的每日记录会自动归属到这次经期。`,
    };
  }

  private async validateHistoryCycleAdjustment(
    profileId: bigint,
    cycleId: bigint,
    startedOn: Date,
    endedOn: Date,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const today = parseDateOnly(toDateKey(new Date()));
    if (startedOn > today || endedOn > today) {
      throw new BadRequestException('history cycle date cannot be in the future');
    }
    if (endedOn < startedOn) {
      throw new BadRequestException('cycle end date must be after start date');
    }
    if (diffDays(endedOn, startedOn) + 1 > MAX_VALID_PERIOD_DAYS) {
      throw new BadRequestException('cycle period length is too long');
    }
    const cycle = await tx.menstrualCycle.findFirst({
      where: { id: cycleId, profileId, status: 'completed' },
    });
    if (!cycle) {
      throw new BadRequestException('history cycle not found');
    }
    const overlappingCycle = await tx.menstrualCycle.findFirst({
      where: {
        profileId,
        id: { not: cycleId },
        startedOn: { lte: endedOn },
        OR: [{ endedOn: null }, { endedOn: { gte: startedOn } }],
      },
    });
    if (overlappingCycle) {
      throw new BadRequestException('period range overlaps existing cycle');
    }
  }

  private async buildHistoryCycleAdjustmentPreview(profileId: bigint, cycleId: bigint, startedOn: Date, endedOn: Date) {
    const cycle = await this.prisma.menstrualCycle.findFirst({
      where: { id: cycleId, profileId, status: 'completed' },
    });
    if (!cycle || !cycle.endedOn) {
      throw new BadRequestException('history cycle not found');
    }
    const logs = await this.prisma.menstrualDailyLog.findMany({
      where: {
        profileId,
        OR: [
          { cycleId },
          { recordDate: { gte: startedOn, lte: endedOn } },
          { recordDate: { gte: cycle.startedOn, lte: cycle.endedOn } },
        ],
      },
      orderBy: { recordDate: 'asc' },
    });
    const affectedRecords = logs
      .filter((log) => log.cycleId === cycleId || (log.recordDate >= startedOn && log.recordDate <= endedOn))
      .map((log) => {
        const inNewRange = log.recordDate >= startedOn && log.recordDate <= endedOn;
        return {
          date: toDateKey(log.recordDate),
          oldCycleDay:
            log.cycleDaySnapshot ?? (log.cycleId === cycleId ? diffDays(log.recordDate, cycle.startedOn) + 1 : null),
          newCycleDay: inNewRange ? diffDays(log.recordDate, startedOn) + 1 : null,
          locked: Boolean(log.cycleDayLocked),
        };
      })
      .filter((item) => item.oldCycleDay !== item.newCycleDay);
    const movedOutDates = logs
      .filter((log) => log.cycleId === cycleId && (log.recordDate < startedOn || log.recordDate > endedOn))
      .map((log) => toDateKey(log.recordDate));
    const movedInDates = logs
      .filter((log) => log.cycleId !== cycleId && log.recordDate >= startedOn && log.recordDate <= endedOn)
      .map((log) => toDateKey(log.recordDate));
    const summary =
      affectedRecords.length > 0
        ? `将影响 ${affectedRecords.length} 条已有记录的经期第几天语义。`
        : '这次调整不会改变已有记录的经期天数语义。';
    return {
      cycleId: cycleId.toString(),
      startedOn: toDateKey(startedOn),
      endedOn: toDateKey(endedOn),
      affectedRecords,
      movedOutDates,
      movedInDates,
      summary,
    };
  }

  private async findCycleForDate(profileId: bigint, recordDate: Date) {
    const activeCycle = await this.prisma.menstrualCycle.findFirst({
      where: {
        profileId,
        status: 'in_progress',
        startedOn: { lte: recordDate },
        OR: [{ endedOn: null }, { endedOn: { gte: recordDate } }],
      },
      orderBy: [{ startedOn: 'desc' }, { id: 'desc' }],
    });
    if (activeCycle) {
      return activeCycle;
    }

    return this.prisma.menstrualCycle.findFirst({
      where: {
        profileId,
        status: 'completed',
        startedOn: { lte: recordDate },
        endedOn: { gte: recordDate },
      },
      orderBy: [{ startedOn: 'desc' }, { id: 'desc' }],
    });
  }

  private buildStatusCard({
    recordDate,
    selectedCycle,
    activeCycle,
    lastCompletedCycle,
    basePrediction,
  }: {
    recordDate: Date;
    selectedCycle: SelectedDateCycleDto | null;
    activeCycle: { startedOn: Date; endedOn: Date | null } | null;
    lastCompletedCycle: { endedOn: Date | null } | null;
    basePrediction: BasePrediction;
  }): StatusCardDto {
    const today = parseDateOnly(toDateKey(new Date()));
    const selectedLabel = sameDate(recordDate, today) ? '今天' : formatCnDateLabel(recordDate);
    const isFuture = recordDate > today;

    if (isFuture) {
      return {
        tone: 'blocked',
        eyebrow: `当前查看：${selectedLabel}`,
        title: '未来日期暂不能确认经期状态',
        description: '等到这一天之后，再根据实际情况确认开始或结束。',
        meta: '可以先查看预测，等日期到了再确认会更准确。',
        actions: [{ key: 'disabled', label: '暂不可操作', enabled: false, icon: 'lock' }],
      };
    }

    if (selectedCycle?.status === 'completed') {
      const rangeLabel = selectedCycle.endedOn
        ? `本次经期：${formatDateKeyCnLabel(selectedCycle.startedOn)} - ${formatDateKeyCnLabel(selectedCycle.endedOn)}`
        : `本次经期从 ${formatDateKeyCnLabel(selectedCycle.startedOn)} 开始`;
      const title = selectedCycle.isStartDate
        ? '这是一次经期的开始日'
        : selectedCycle.isEndDate
          ? '这是一次经期的结束日'
          : '这一天已在已记录经期中';
      return {
        tone: 'blocked',
        eyebrow: `当前查看：${selectedLabel}`,
        title,
        description: `${rangeLabel}。这一天已经在这次经期里。`,
        meta: '如果这次经期的开始或结束日期不准确，可以在这里调整。',
        actions: [
          { key: 'edit_record', label: '编辑这天记录', enabled: true, icon: 'record' },
          { key: 'adjust_history_cycle', label: '调整历史经期', enabled: true, icon: 'edit' },
        ],
      };
    }

    if (selectedCycle?.status === 'in_progress') {
      if (selectedCycle.isStartDate) {
        return {
          tone: 'active',
          eyebrow: '本次经期进行中',
          title: '这是本次经期开始日',
          description: `已从 ${formatDateKeyCnLabel(selectedCycle.startedOn)} 开始记录。你可以继续补充这一天的状态，或调整开始日期。`,
          meta: this.buildActiveCycleMeta(selectedCycle.startedOn, basePrediction.basePeriodLengthDays),
          actions: [
            { key: 'edit_record', label: '记录状态', enabled: true, icon: 'record' },
            { key: 'adjust_current_start', label: '调整开始日期', enabled: true, icon: 'edit' },
          ],
        };
      }

      return {
        tone: 'active',
        eyebrow: '本次经期进行中',
        title: sameDate(recordDate, today) ? '今天经期结束了吗？' : '要把这一天设为经期结束日吗？',
        description: `确认后，本次经期会结束于 ${selectedLabel}。如果还没结束，可以继续记录状态。`,
        meta: this.buildActiveCycleMeta(selectedCycle.startedOn, basePrediction.basePeriodLengthDays),
        actions: [
          {
            key: 'confirm_end',
            label: sameDate(recordDate, today) ? '确认今天已结束' : '设为经期结束日',
            enabled: true,
            icon: 'check',
          },
          { key: 'edit_record', label: '记录状态', enabled: true, icon: 'record' },
        ],
      };
    }

    if (activeCycle) {
      if (recordDate < activeCycle.startedOn) {
        return {
          tone: 'blocked',
          eyebrow: `本次开始：${formatCnDateLabel(activeCycle.startedOn)}`,
          title: '这一天早于本次经期开始日',
          description: '如果本次经期实际开始得更早，可以调整开始日期。',
          meta: `当前查看：${selectedLabel}`,
          actions: [
            { key: 'adjust_current_start', label: '调整开始日期', enabled: true, icon: 'edit' },
            { key: 'edit_record', label: '记录日常状态', enabled: true, icon: 'record' },
          ],
        };
      }

      return {
        tone: 'blocked',
        eyebrow: '本次经期进行中',
        title: '这一天还没有纳入本次经期',
        description: '如果日期显示不符合实际情况，可以先调整本次经期开始日期。',
        meta: `本次经期从 ${formatCnDateLabel(activeCycle.startedOn)} 开始`,
        actions: [{ key: 'adjust_current_start', label: '调整开始日期', enabled: true, icon: 'edit' }],
      };
    }

    if (lastCompletedCycle?.endedOn && recordDate <= lastCompletedCycle.endedOn) {
      return {
        tone: 'blocked',
        eyebrow: `当前查看：${selectedLabel}`,
        title: '这是较早的历史日期',
        description: '这一天早于最近一次经期。如果需要补录以前的经期，可以从历史记录里添加。',
        meta: `最近一次经期结束于 ${formatCnDateLabel(lastCompletedCycle.endedOn)}`,
        actions: [
          { key: 'edit_record', label: '记录日常状态', enabled: true, icon: 'record' },
          { key: 'backfill_history_disabled', label: '补录历史经期', enabled: false, icon: 'edit' },
        ],
      };
    }

    const daysUntilPeriod = Math.max(0, diffDays(basePrediction.predictedPeriodStartDate, today));
    const overdueDays = Math.max(0, diffDays(today, basePrediction.predictedPeriodStartDate));
    const meta =
      overdueDays > 0
        ? `预测已推迟 ${overdueDays} 天`
        : daysUntilPeriod === 0
          ? '预测经期已到'
          : daysUntilPeriod <= 2
            ? '经期可能快到了'
            : '当前未处于经期';

    return {
      tone: 'ready',
      eyebrow: `当前查看：${selectedLabel}`,
      title: sameDate(recordDate, today) ? '今天来月经了吗？' : '这一天是经期开始日吗？',
      description: `确认后，系统会从 ${selectedLabel} 开始记录本次经期。`,
      meta,
      actions: [{ key: 'confirm_start', label: '设为经期开始日', enabled: true, icon: 'check' }],
    };
  }

  private buildActiveCycleMeta(startDateKey: string, periodDuration: number) {
    const dayIndex = Math.max(1, diffDays(parseDateOnly(toDateKey(new Date())), parseDateOnly(startDateKey)) + 1);
    const remainingDays = Math.max(0, periodDuration - dayIndex);
    return remainingDays > 0 ? `本次第 ${dayIndex} 天，预计还剩 ${remainingDays} 天左右` : `本次第 ${dayIndex} 天`;
  }

  private toSelectedDateCycle(
    cycle: {
      status: string;
      startedOn: Date;
      endedOn: Date | null;
    },
    recordDate: Date,
  ): SelectedDateCycleDto {
    return {
      status: cycle.status === 'completed' ? 'completed' : 'in_progress',
      startedOn: toDateKey(cycle.startedOn),
      endedOn: cycle.endedOn ? toDateKey(cycle.endedOn) : null,
      isStartDate: sameDate(cycle.startedOn, recordDate),
      isEndDate: cycle.endedOn ? sameDate(cycle.endedOn, recordDate) : false,
    };
  }

  private toLogData(payload: DailyRecordPayload, userId: bigint, cycle: { id: bigint; startedOn: Date } | null) {
    const recordDate = parseDateOnly(payload.recordDate);
    const calculatedCycleDay = cycle ? diffDays(recordDate, cycle.startedOn) + 1 : null;
    return {
      cycleId: cycle?.id ?? null,
      cycleDaySnapshot: cycle
        ? payload.cycleDayLocked
          ? (payload.cycleDaySnapshot ?? calculatedCycleDay)
          : calculatedCycleDay
        : null,
      cycleDaySource: cycle ? (payload.cycleDayLocked ? 'user_confirmed' : 'auto') : null,
      cycleDayLocked: cycle ? Boolean(payload.cycleDayLocked) : false,
      moodState: payload.mood,
      flowLevel: payload.flow,
      painLevel: payload.painLevel,
      bloodColor: payload.bloodColor,
      bloodClotFlag: payload.bloodClot,
      dischargeType: payload.dischargeType,
      abdomenPainArea: payload.abdomenPainArea,
      backPainLevel: payload.backPainLevel,
      breastTendernessLevel: payload.breastTendernessLevel,
      skinStatus: payload.skinStatus,
      sleepQuality: payload.sleepQuality,
      stressLevel: payload.stressLevel,
      dietStatus: payload.dietStatus,
      exerciseLevel: payload.exerciseLevel,
      bodyTemperature: payload.temperature ? Number(payload.temperature) : null,
      weightChangeValue: payload.weightKg ? Number(payload.weightKg) : null,
      abnormalEventText: payload.abnormalEvent,
      noteText: JSON.stringify({ note: payload.note, symptoms: payload.symptoms }),
      updatedByUserId: userId,
    };
  }

  private toReminderSettings(settings: {
    periodStartReminderEnabled: boolean;
    periodStartReminderOffsetDays: number;
    periodDueReminderEnabled: boolean;
    periodEndReminderEnabled: boolean;
    sharedReminderEnabled: boolean;
    reminderHour: number;
    reminderMinute: number;
  }) {
    const hourLabel = settings.reminderHour < 12 ? '上午' : '下午';
    const displayHour =
      settings.reminderHour === 0
        ? 12
        : settings.reminderHour > 12
          ? settings.reminderHour - 12
          : settings.reminderHour;
    const displayMinute = String(settings.reminderMinute).padStart(2, '0');
    return {
      periodStartReminderEnabled: settings.periodStartReminderEnabled,
      periodStartReminderOffsetDays: settings.periodStartReminderOffsetDays,
      periodDueReminderEnabled: settings.periodDueReminderEnabled,
      periodEndReminderEnabled: settings.periodEndReminderEnabled,
      sharedReminderEnabled: settings.sharedReminderEnabled,
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
      reminderTimeLabel: `${hourLabel} ${String(displayHour).padStart(2, '0')}:${displayMinute}`,
      previewText: `预计经期前 ${settings.periodStartReminderOffsetDays} 天提醒，记得提前准备，照顾好自己。`,
    };
  }

  private async dispatchDueReminders() {
    if (this.reminderScanRunning) {
      return;
    }
    this.reminderScanRunning = true;

    try {
      const now = new Date();
      const today = parseDateOnly(toDateKey(now));
      const settingsList = await this.prisma.menstrualReminderSetting.findMany({
        where: {
          reminderHour: now.getHours(),
          reminderMinute: now.getMinutes(),
          OR: [
            { periodStartReminderEnabled: true },
            { periodDueReminderEnabled: true },
            { periodEndReminderEnabled: true },
          ],
        },
      });

      for (const settings of settingsList) {
        const profile = await this.prisma.menstrualProfile.findUnique({
          where: { relationshipId: settings.relationshipId },
        });
        if (!profile) {
          continue;
        }

        const prediction = await this.buildBasePrediction(profile);
        const recipients = [
          profile.femaleUserId,
          ...(settings.sharedReminderEnabled &&
          profile.maleAccessGranted &&
          profile.maleViewEnabled &&
          profile.maleUserId
            ? [profile.maleUserId]
            : []),
        ];

        const startReminderDate = addDays(prediction.predictedPeriodStartDate, -settings.periodStartReminderOffsetDays);
        if (settings.periodStartReminderEnabled && sameDate(startReminderDate, today)) {
          await this.createPeriodReminderNotifications({
            profile,
            recipients,
            notificationType: 'period_start_reminder',
            title: '经期快到了',
            content: `预计 ${settings.periodStartReminderOffsetDays} 天后到经期，记得提前准备，照顾好自己。`,
            now,
            today,
          });
        }

        if (settings.periodDueReminderEnabled && sameDate(prediction.predictedPeriodStartDate, today)) {
          await this.createPeriodReminderNotifications({
            profile,
            recipients,
            notificationType: 'period_due_reminder',
            title: '预计经期到了',
            content: '今天是预计经期到来的日子，可以确认是否已经开始，并及时记录状态。',
            now,
            today,
          });
        }

        const currentCycle = await this.prisma.menstrualCycle.findFirst({
          where: { profileId: profile.id, status: 'in_progress' },
          orderBy: { startedOn: 'desc' },
        });
        if (settings.periodEndReminderEnabled && currentCycle) {
          const expectedEndDate = addDays(currentCycle.startedOn, prediction.basePeriodLengthDays - 1);
          if (sameDate(expectedEndDate, today)) {
            await this.createPeriodReminderNotifications({
              profile,
              recipients,
              notificationType: 'period_end_reminder',
              title: '经期结束记录提醒',
              content: '如果这次经期已经结束，记得补全结束时间，让后续预测更准确。',
              now,
              today,
            });
          }
        }
      }
    } finally {
      this.reminderScanRunning = false;
    }
  }

  private async createPeriodReminderNotifications({
    profile,
    recipients,
    notificationType,
    title,
    content,
    now,
    today,
  }: {
    profile: MenstrualProfile;
    recipients: bigint[];
    notificationType: string;
    title: string;
    content: string;
    now: Date;
    today: Date;
  }) {
    const dayStart = today;
    const dayEnd = addDays(dayStart, 1);

    for (const userId of recipients) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          relationshipId: profile.relationshipId,
          notificationType,
          targetType: 'period',
          targetId: profile.id,
          sentAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      });
      if (existing) {
        continue;
      }

      await this.notificationsService.createAndDispatch({
        userId,
        relationshipId: profile.relationshipId,
        notificationType,
        title,
        content,
        targetType: 'period',
        targetId: profile.id,
        settingKey: 'periodReminders',
        sentAt: now,
        data: {
          route: 'Period',
        },
      });
    }
  }

  private toPermissions(context: Awaited<ReturnType<PeriodService['getContext']>>, profile: MenstrualProfile) {
    const canManagePermission = profile.femaleUserId === context.userId;
    const partnerUser = canManagePermission ? context.maleUser : context.femaleUser;
    const statusLabel = profile.maleAccessGranted
      ? profile.maleEditEnabled
        ? '已授权查看和代记'
        : '已授权查看'
      : '未授权';

    return {
      canManagePermission,
      partnerNickname: partnerUser?.nickname ?? '另一半',
      partnerGender: partnerUser?.gender ?? null,
      maleAccessGranted: profile.maleAccessGranted,
      maleViewEnabled: profile.maleViewEnabled,
      maleEditEnabled: profile.maleEditEnabled,
      grantedAt: profile.grantedAt ? formatDateTime(profile.grantedAt) : null,
      revokedAt: profile.revokedAt ? formatDateTime(profile.revokedAt) : null,
      statusLabel,
      description: canManagePermission
        ? '你可以决定另一半是否能查看经期预测，或帮你记录经期开始和结束。'
        : profile.maleAccessGranted
          ? '对方已向你共享经期状态，请尊重对方隐私，只在需要照顾时查看。'
          : '对方还没有向你共享经期状态。授权开启后，这里会显示可查看范围。',
    };
  }

  private async getContext(userId: bigint) {
    const relationship = await this.prisma.coupleRelationship.findFirst({
      where: { status: 'active', roleConfirmationStatus: 'confirmed', OR: [{ userAId: userId }, { userBId: userId }] },
    });
    if (!relationship) {
      throw new BadRequestException('active relationship not found');
    }
    const [currentUser, userA, userB] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: relationship.userAId } }),
      this.prisma.user.findUnique({ where: { id: relationship.userBId } }),
    ]);
    const femaleUser = userA?.gender === 'female' ? userA : userB?.gender === 'female' ? userB : currentUser;
    const maleUser = femaleUser?.id === userA?.id ? userB : userA;
    return { userId, relationship, currentUser, femaleUser, maleUser };
  }

  private async ensureProfile(context: Awaited<ReturnType<PeriodService['getContext']>>) {
    if (!context.femaleUser) {
      throw new BadRequestException('female user not found');
    }
    return this.prisma.menstrualProfile.upsert({
      where: { relationshipId: context.relationship.id },
      update: { femaleUserId: context.femaleUser.id, maleUserId: context.maleUser?.id },
      create: {
        relationshipId: context.relationship.id,
        femaleUserId: context.femaleUser.id,
        maleUserId: context.maleUser?.id,
      },
    });
  }

  private async ensureCanView(context: Awaited<ReturnType<PeriodService['getContext']>>, profile: MenstrualProfile) {
    if (profile.femaleUserId === context.userId) {
      return;
    }
    if (!profile.maleAccessGranted || !profile.maleViewEnabled) {
      throw new ForbiddenException('period data is not shared');
    }
  }

  private async ensureCanEdit(context: Awaited<ReturnType<PeriodService['getContext']>>, profile: MenstrualProfile) {
    if (profile.femaleUserId === context.userId) {
      return;
    }
    if (!profile.maleAccessGranted || !profile.maleEditEnabled) {
      throw new ForbiddenException('period data is not editable');
    }
  }

  private ensureFemaleOwner(context: Awaited<ReturnType<PeriodService['getContext']>>, profile: MenstrualProfile) {
    if (profile.femaleUserId !== context.userId) {
      throw new ForbiddenException('only female user can adjust period cycle');
    }
  }
}

function parseDateOnly(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('invalid date');
  }
  return date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return parseDateOnly(toDateKey(next));
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return parseDateOnly(toDateKey(next));
}

function diffDays(a: Date, b: Date) {
  return Math.round((parseDateOnly(toDateKey(a)).getTime() - parseDateOnly(toDateKey(b)).getTime()) / 86400000);
}

function sameDate(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

function average(values: number[], fallback: number) {
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : fallback;
}

function weightedAverage(values: number[], fallback: number) {
  if (values.length === 0) {
    return fallback;
  }
  const weights = RECENT_WEIGHTS.slice(0, values.length);
  const weightTotal = weights.reduce((total, value) => total + value, 0);
  return Math.round(values.reduce((total, value, index) => total + value * (weights[index] / weightTotal), 0));
}

function buildRangeInsight(
  value: number,
  normalMin: number,
  normalMax: number,
  normalLabel = '正常',
  title = '',
  unit = '天',
) {
  const chartMin = Math.max(0, normalMin - (normalMax - normalMin));
  const chartMax = normalMax + (normalMax - normalMin);
  const progressPercent = Math.round(
    ((Math.min(chartMax, Math.max(chartMin, value)) - chartMin) / (chartMax - chartMin)) * 100,
  );
  const normalRangeStartPercent = Math.round(((normalMin - chartMin) / (chartMax - chartMin)) * 100);
  const normalRangeEndPercent = Math.round(((normalMax - chartMin) / (chartMax - chartMin)) * 100);

  return {
    title,
    value,
    unit,
    label: value < normalMin ? '偏短' : value > normalMax ? '偏长' : normalLabel,
    lowerLabel: '偏短',
    upperLabel: '偏长',
    normalRangeLabel: `正常范围 (${normalMin}-${normalMax}${unit})`,
    normalMin,
    normalMax,
    progressPercent,
    normalRangeStartPercent,
    normalRangeEndPercent,
  };
}

function varianceRange(values: number[]) {
  return values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;
}

function isNumber(value: number | null): value is number {
  return typeof value === 'number';
}

function formatCnDateLabel(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDateKeyCnLabel(value: string) {
  return formatCnDateLabel(parseDateOnly(value));
}

function confidenceLevelToScore(level: string) {
  if (level === 'high') return 0.88;
  if (level === 'low') return 0.62;
  return 0.76;
}

function clampAiDate(value: string | null, baseDate: Date, maxShiftDays: number) {
  if (!value) {
    return null;
  }
  const date = parseDateOnly(value);
  const shift = diffDays(date, baseDate);
  if (Math.abs(shift) <= maxShiftDays) {
    return date;
  }
  return addDays(baseDate, shift > 0 ? maxShiftDays : -maxShiftDays);
}

function getPhaseByDates(today: Date, periodStart: Date, periodEnd: Date, ovulationStart: Date, ovulationEnd: Date) {
  if (today >= periodStart && today <= periodEnd) {
    return 'period';
  }
  if (today >= ovulationStart && today <= ovulationEnd) {
    return 'ovulation';
  }
  if (today > periodEnd && today < ovulationStart) {
    return 'follicular';
  }
  return 'luteal';
}

function summarizeLogs(logs: MenstrualDailyLog[]) {
  if (logs.length === 0) {
    return 'no daily record';
  }
  const symptomCounts = new Map<string, number>();
  for (const log of logs) {
    for (const symptom of parseNotePayload(log.noteText).symptoms) {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1);
    }
    if (log.dietStatus && log.dietStatus !== '正常') {
      symptomCounts.set(log.dietStatus, (symptomCounts.get(log.dietStatus) ?? 0) + 1);
    }
    if (log.sleepQuality === '差') {
      symptomCounts.set('睡眠差', (symptomCounts.get('睡眠差') ?? 0) + 1);
    }
    if ((log.painLevel ?? 0) >= 4) {
      symptomCounts.set('疼痛明显', (symptomCounts.get('疼痛明显') ?? 0) + 1);
    }
  }
  const top = Array.from(symptomCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name}:${count}`)
    .join(', ');
  return top || 'records exist but no clear repeated symptom';
}

function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function phaseLabel(key: string) {
  return key === 'period' ? '经期中' : key === 'ovulation' ? '排卵期' : key === 'follicular' ? '卵泡期' : '黄体期';
}

function parseNotePayload(value: string | null) {
  if (!value) {
    return { note: '', symptoms: [] as string[] };
  }
  try {
    const parsed = JSON.parse(value) as { note?: string; symptoms?: string[] };
    return { note: parsed.note ?? '', symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [] };
  } catch {
    return { note: value, symptoms: [] as string[] };
  }
}
