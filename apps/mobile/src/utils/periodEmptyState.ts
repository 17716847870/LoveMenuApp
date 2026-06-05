import {
  PeriodAnalysisDto,
  PeriodCalendarMonthDto,
  PeriodDailyRecordDraftDto,
  PeriodDailyRecordOptionsDto,
  PeriodHomeOverviewDto,
  PeriodPredictionDto,
  PeriodReminderSettingsDto,
} from '../types/period';

const monthLabels = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
];

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatPeriodMonthTitle(year: number, month: number) {
  return `${monthLabels[month - 1] ?? `${month}月`} ${year}`;
}

export const periodHomeOverviewEmpty: PeriodHomeOverviewDto = {
  appName: '经期助手',
  currentPhaseLabel: '等待同步',
  currentPhaseKey: 'luteal',
  cycleDay: 0,
  cycleLength: 28,
  periodDuration: 5,
  daysUntilPeriod: 0,
  nextPeriodDateLabel: '',
  ovulationRangeLabel: '',
  ovulationHint: '',
  mood: '',
  moodNote: '',
  summary: '',
  isPeriodConfirmed: false,
  actualPeriodStartDate: null,
  actualPeriodEndDate: null,
  lastCompletedPeriodEndDate: null,
  hasTodayRecord: false,
  isPredictionReachedButUnconfirmed: false,
  overdueDays: 0,
  maleAccessGranted: false,
  maleViewEnabled: false,
  maleEditEnabled: false,
  recordingMode: 'auto',
  currentCycleRecordedDates: [],
  needsInitialCycles: false,
};

export const periodDailyRecordDraftEmpty: PeriodDailyRecordDraftDto = {
  recordDate: toDateKey(new Date()),
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
  mood: '',
  flow: '',
  painLevel: 0,
  bloodColor: '',
  bloodClot: false,
  dischargeType: '',
  abdomenPainArea: '',
  backPainLevel: 0,
  breastTendernessLevel: 0,
  skinStatus: '',
  sleepQuality: '',
  stressLevel: 0,
  dietStatus: '',
  exerciseLevel: '',
  symptoms: [],
  weightKg: '',
  temperature: '',
  abnormalEvent: '',
  note: '',
};

export const periodDailyRecordOptionsEmpty: PeriodDailyRecordOptionsDto = {
  moodOptions: [],
  flowOptions: [],
  bloodColorOptions: [],
  dischargeOptions: [],
  abdomenAreas: [],
  skinOptions: [],
  sleepOptions: [],
  dietOptions: [],
  exerciseOptions: [],
  symptomOptions: [],
};

export const periodCalendarMonthEmpty = (date = new Date()): PeriodCalendarMonthDto => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  cycleDay: 0,
  summaryText: '正在同步周期数据',
  selectedDay: date.getDate(),
  markers: [],
});

export const periodPredictionEmpty: PeriodPredictionDto = {
  nextPeriodDateLabel: '',
  daysUntilPeriod: 0,
  ovulationRangeLabel: '',
  confidencePercent: 0,
  aiAvailable: false,
  aiAdjusted: false,
  adjustmentReasonSummary: '',
  adjustedPeriodEndDateLabel: '',
  advice: [],
};

export const periodAnalysisEmpty: PeriodAnalysisDto = {
  averageCycleLength: 0,
  averagePeriodDuration: 0,
  monthLabels: [],
  cycleLengths: [],
  durationLengths: [],
  regularityLabel: '等待同步',
  regularityDescription: '',
  cycleLengthInsight: {
    title: '当前周期长度',
    value: 0,
    unit: '天',
    label: '等待同步',
    lowerLabel: '偏短',
    upperLabel: '偏长',
    normalRangeLabel: '正常范围 (21-35天)',
    normalMin: 21,
    normalMax: 35,
    progressPercent: 0,
    normalRangeStartPercent: 20,
    normalRangeEndPercent: 80,
  },
  periodDurationInsight: {
    title: '经期天数',
    value: 0,
    unit: '天',
    label: '等待同步',
    lowerLabel: '偏短',
    upperLabel: '偏长',
    normalRangeLabel: '正常范围 (3-7天)',
    normalMin: 3,
    normalMax: 7,
    progressPercent: 0,
    normalRangeStartPercent: 20,
    normalRangeEndPercent: 80,
  },
  symptomInsights: [],
  symptomTrends: [],
  aiAvailable: false,
  aiSummary: '',
  healthTips: [],
};

export const periodReminderSettingsEmpty: PeriodReminderSettingsDto = {
  periodStartReminderEnabled: false,
  periodStartReminderOffsetDays: 2,
  periodDueReminderEnabled: false,
  periodEndReminderEnabled: false,
  sharedReminderEnabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  reminderTimeLabel: '上午 09:00',
  previewText: '',
};
