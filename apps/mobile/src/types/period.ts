export type MenstrualPhaseKey = 'period' | 'follicular' | 'ovulation' | 'luteal';
export type PeriodRecordAlignmentMode = 'auto' | 'manual';

export type PeriodCalendarMarkerType =
  | 'period'
  | 'period_range'
  | 'follicular'
  | 'ovulation'
  | 'ovulation_range'
  | 'luteal'
  | 'predicted_period';

export type PeriodCalendarMarker = {
  date: string;
  type: PeriodCalendarMarkerType;
};

export type PeriodCalendarMonthDto = {
  year: number;
  month: number;
  cycleDay: number;
  summaryText: string;
  selectedDay: number | null;
  markers: PeriodCalendarMarker[];
};

export type PeriodHomeOverviewDto = {
  appName: string;
  currentPhaseLabel: string;
  currentPhaseKey: MenstrualPhaseKey;
  cycleDay: number;
  cycleLength: number;
  periodDuration: number;
  daysUntilPeriod: number;
  nextPeriodDateLabel: string;
  ovulationRangeLabel: string;
  ovulationHint: string;
  mood: string;
  moodNote: string;
  summary: string;
  isPeriodConfirmed: boolean;
  actualPeriodStartDate: string | null;
  actualPeriodEndDate: string | null;
  lastCompletedPeriodEndDate?: string | null;
  hasTodayRecord: boolean;
  isPredictionReachedButUnconfirmed: boolean;
  overdueDays: number;
  maleAccessGranted: boolean;
  maleViewEnabled: boolean;
  maleEditEnabled: boolean;
  recordingMode: PeriodRecordAlignmentMode;
  currentCycleRecordedDates: string[];
  needsInitialCycles?: boolean;
};

export type PeriodAnalysisDto = {
  averageCycleLength: number;
  averagePeriodDuration: number;
  monthLabels: string[];
  cycleLengths: number[];
  durationLengths: number[];
  regularityLabel: string;
  regularityDescription: string;
  cycleLengthInsight: PeriodRangeInsightDto;
  periodDurationInsight: PeriodRangeInsightDto;
  symptomInsights: string[];
  symptomTrends: Array<{
    title: string;
    description: string;
    kind: 'diet' | 'sleep' | 'pain' | 'mood' | 'symptom' | 'general';
    count: number;
  }>;
  aiAvailable: boolean;
  aiSummary: string;
  healthTips: string[];
};

export type PeriodRangeInsightDto = {
  title: string;
  value: number;
  unit: string;
  label: string;
  lowerLabel: string;
  upperLabel: string;
  normalRangeLabel: string;
  normalMin: number;
  normalMax: number;
  progressPercent: number;
  normalRangeStartPercent: number;
  normalRangeEndPercent: number;
};

export type PeriodPredictionDto = {
  nextPeriodDateLabel: string;
  daysUntilPeriod: number;
  ovulationRangeLabel: string;
  confidencePercent: number;
  aiAvailable: boolean;
  aiAdjusted: boolean;
  adjustmentReasonSummary: string;
  adjustedPeriodEndDateLabel: string;
  advice: string[];
};

export type PeriodReminderSettingsDto = {
  periodStartReminderEnabled: boolean;
  periodStartReminderOffsetDays: number;
  periodDueReminderEnabled: boolean;
  periodEndReminderEnabled: boolean;
  sharedReminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  reminderTimeLabel: string;
  previewText: string;
};

export type PeriodPermissionDto = {
  canManagePermission: boolean;
  partnerNickname: string;
  partnerGender: string | null;
  maleAccessGranted: boolean;
  maleViewEnabled: boolean;
  maleEditEnabled: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  statusLabel: string;
  description: string;
};

export type PeriodSelectedDateCycleDto = {
  status: 'completed' | 'in_progress';
  startedOn: string;
  endedOn: string | null;
  isStartDate: boolean;
  isEndDate: boolean;
};

export type PeriodStatusCardActionKey =
  | 'confirm_start'
  | 'confirm_end'
  | 'edit_record'
  | 'adjust_current_start'
  | 'adjust_history_cycle'
  | 'backfill_history_disabled'
  | 'disabled';

export type PeriodStatusCardDto = {
  tone: 'active' | 'blocked' | 'ready';
  eyebrow: string;
  title: string;
  description: string;
  meta: string | null;
  actions: Array<{
    key: PeriodStatusCardActionKey;
    label: string;
    enabled: boolean;
    icon: 'check' | 'edit' | 'record' | 'lock';
  }>;
};

export type PeriodDailyRecordDraftDto = {
  recordDate: string;
  recordType: 'period' | 'daily';
  isPeriodDay: boolean;
  selectedDateCycle: PeriodSelectedDateCycleDto | null;
  statusCard: PeriodStatusCardDto;
  cycleDaySnapshot: number | null;
  cycleDaySource: 'auto' | 'user_confirmed' | 'adjusted' | null;
  cycleDayLocked: boolean;
  calculatedCycleDay: number | null;
  hasRecord: boolean;
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

export type PeriodDailyRecordOptionsDto = {
  moodOptions: string[];
  flowOptions: string[];
  bloodColorOptions: string[];
  dischargeOptions: string[];
  abdomenAreas: string[];
  skinOptions: string[];
  sleepOptions: string[];
  dietOptions: string[];
  exerciseOptions: string[];
  symptomOptions: string[];
};

export type PeriodDailyRecordSavePayload = PeriodDailyRecordDraftDto;

export type PeriodInitialCyclePayload = {
  startedOn: string;
  endedOn: string;
};

export type PeriodHistoryCycleDto = {
  cycleId: string;
  startedOn: string;
  endedOn: string;
  periodLengthDays: number;
  recordedDates: string[];
  selectedDate: string;
  title: string;
  description: string;
};

export type PeriodCycleDayAdjustmentStrategy = 'recalculate' | 'preserve';

export type PeriodHistoryCycleAdjustmentPreviewDto = {
  cycleId: string;
  startedOn: string;
  endedOn: string;
  affectedRecords: Array<{
    date: string;
    oldCycleDay: number | null;
    newCycleDay: number | null;
    locked: boolean;
  }>;
  movedOutDates: string[];
  movedInDates: string[];
  summary: string;
};
