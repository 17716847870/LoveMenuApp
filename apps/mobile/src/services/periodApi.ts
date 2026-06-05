import { patch, post, request } from './apiClient';
import {
  PeriodAnalysisDto,
  PeriodCalendarMonthDto,
  PeriodDailyRecordDraftDto,
  PeriodDailyRecordOptionsDto,
  PeriodDailyRecordSavePayload,
  PeriodCycleDayAdjustmentStrategy,
  PeriodHomeOverviewDto,
  PeriodHistoryCycleAdjustmentPreviewDto,
  PeriodHistoryCycleDto,
  PeriodInitialCyclePayload,
  PeriodPermissionDto,
  PeriodPredictionDto,
  PeriodRecordAlignmentMode,
  PeriodReminderSettingsDto,
} from '../types/period';

let selectedRecordDateStore = new Date().toISOString().slice(0, 10);

function toTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export const periodApi = {
  getHomeOverview() {
    return request<PeriodHomeOverviewDto>('/period/overview');
  },

  getCalendarMonth(year: number, month: number) {
    return request<PeriodCalendarMonthDto>(`/period/calendar?year=${year}&month=${month}`);
  },

  getPrediction() {
    return request<PeriodPredictionDto>('/period/prediction');
  },

  getAnalysis() {
    return request<PeriodAnalysisDto>('/period/analysis');
  },

  getDailyRecordDraft(date?: string) {
    if (date) {
      selectedRecordDateStore = date;
    }
    return request<PeriodDailyRecordDraftDto>(`/period/daily-record?date=${selectedRecordDateStore}`);
  },

  getDailyRecordOptions() {
    return request<PeriodDailyRecordOptionsDto>('/period/daily-record/options');
  },

  saveDailyRecord(payload: PeriodDailyRecordSavePayload) {
    selectedRecordDateStore = payload.recordDate;
    return post<PeriodDailyRecordDraftDto>('/period/daily-record', payload);
  },

  confirmPeriodStarted(startDate: string) {
    selectedRecordDateStore = startDate;
    return post<PeriodHomeOverviewDto>('/period/cycle/start', { startDate });
  },

  confirmPeriodEnded(endDate: string) {
    selectedRecordDateStore = endDate;
    return post<PeriodHomeOverviewDto>('/period/cycle/end', { endDate });
  },

  updateRecordingMode(mode: PeriodRecordAlignmentMode) {
    return patch<PeriodHomeOverviewDto>('/period/recording-mode', { mode });
  },

  updateCurrentCycleStartDate(startDate: string) {
    selectedRecordDateStore = startDate;
    return patch<{
      overview: PeriodHomeOverviewDto;
      draft: PeriodDailyRecordDraftDto;
    }>('/period/cycle/start-date', { startDate });
  },

  clearCurrentCycleRecords() {
    return request<{
      overview: PeriodHomeOverviewDto;
      draft: PeriodDailyRecordDraftDto;
    }>('/period/cycle/current-records', {
      method: 'DELETE',
    });
  },

  getReminderSettings() {
    return request<PeriodReminderSettingsDto>('/period/reminders');
  },

  updateReminderSettings(payload: Partial<PeriodReminderSettingsDto>) {
    return patch<PeriodReminderSettingsDto>('/period/reminders', payload);
  },

  updatePermissions(payload: { maleViewEnabled?: boolean; maleEditEnabled?: boolean }) {
    return patch<PeriodPermissionDto>('/period/permissions', payload);
  },

  getPermissions() {
    return request<PeriodPermissionDto>('/period/permissions');
  },

  saveInitialCycles(cycles: PeriodInitialCyclePayload[]) {
    return post<PeriodHomeOverviewDto>('/period/initial-cycles', { cycles });
  },

  getHistoryCycle(date: string) {
    return request<PeriodHistoryCycleDto>(`/period/history-cycle?date=${date}`);
  },

  previewHistoryCycleAdjustment(payload: { cycleId: string; startedOn: string; endedOn: string }) {
    return post<PeriodHistoryCycleAdjustmentPreviewDto>('/period/history-cycle/preview', payload);
  },

  updateHistoryCycle(payload: {
    cycleId: string;
    startedOn: string;
    endedOn: string;
    cycleDayStrategy: PeriodCycleDayAdjustmentStrategy;
  }) {
    return patch<PeriodHistoryCycleDto>('/period/history-cycle', payload);
  },

  async getSelectedRecordDate() {
    return { data: selectedRecordDateStore };
  },

  async setSelectedRecordDate(date: string) {
    selectedRecordDateStore = date;
    return { data: selectedRecordDateStore };
  },

  async resetSelectedRecordDate() {
    selectedRecordDateStore = toTodayDateKey();
    return { data: selectedRecordDateStore };
  },
};
