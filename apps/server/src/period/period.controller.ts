import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PeriodService } from './period.service';

@Controller('period')
@UseGuards(JwtAuthGuard)
export class PeriodController {
  constructor(private readonly periodService: PeriodService) {}

  @Get('overview')
  async getOverview(@CurrentUserId() userId: bigint) {
    return { data: await this.periodService.getOverview(userId) };
  }

  @Get('calendar')
  async getCalendar(@Query('year') year: string, @Query('month') month: string, @CurrentUserId() userId: bigint) {
    return { data: await this.periodService.getCalendarMonth(userId, Number(year), Number(month)) };
  }

  @Get('prediction')
  async getPrediction(@CurrentUserId() userId: bigint) {
    return { data: await this.periodService.getPrediction(userId) };
  }

  @Get('analysis')
  async getAnalysis(@CurrentUserId() userId: bigint) {
    return { data: await this.periodService.getAnalysis(userId) };
  }

  @Get('daily-record')
  async getDailyRecord(@Query('date') date: string | undefined, @CurrentUserId() userId: bigint) {
    return { data: await this.periodService.getDailyRecordDraft(userId, date) };
  }

  @Get('daily-record/options')
  async getDailyRecordOptions() {
    return { data: this.periodService.getDailyRecordOptions() };
  }

  @Post('daily-record')
  async saveDailyRecord(
    @Body() body: Parameters<PeriodService['saveDailyRecord']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return { data: await this.periodService.saveDailyRecord(userId, body) };
  }

  @Post('cycle/start')
  async confirmStarted(@Body('startDate') startDate: string, @CurrentUserId() userId: bigint) {
    return { data: await this.periodService.confirmPeriodStarted(userId, startDate) };
  }

  @Post('initial-cycles')
  async saveInitialCycles(
    @Body() body: Parameters<PeriodService['saveInitialCycles']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return { data: await this.periodService.saveInitialCycles(userId, body) };
  }

  @Post('cycle/end')
  async confirmEnded(@Body('endDate') endDate: string, @CurrentUserId() userId: bigint) {
    return { data: await this.periodService.confirmPeriodEnded(userId, endDate) };
  }

  @Patch('recording-mode')
  async updateRecordingMode(@Body('mode') mode: 'auto' | 'manual', @CurrentUserId() userId: bigint) {
    return { data: await this.periodService.updateRecordingMode(userId, mode) };
  }

  @Patch('cycle/start-date')
  async updateCycleStartDate(@Body('startDate') startDate: string, @CurrentUserId() userId: bigint) {
    return { data: await this.periodService.updateCurrentCycleStartDate(userId, startDate) };
  }

  @Delete('cycle/current-records')
  async clearCurrentCycleRecords(@CurrentUserId() userId: bigint) {
    return { data: await this.periodService.clearCurrentCycleRecords(userId) };
  }

  @Get('history-cycle')
  async getHistoryCycle(@Query('date') date: string, @CurrentUserId() userId: bigint) {
    return { data: await this.periodService.getHistoryCycle(userId, date) };
  }

  @Post('history-cycle/preview')
  async previewHistoryCycleAdjustment(
    @Body() body: Parameters<PeriodService['previewHistoryCycleAdjustment']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return { data: await this.periodService.previewHistoryCycleAdjustment(userId, body) };
  }

  @Patch('history-cycle')
  async updateHistoryCycle(
    @Body() body: Parameters<PeriodService['updateHistoryCycle']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return { data: await this.periodService.updateHistoryCycle(userId, body) };
  }

  @Get('reminders')
  async getReminderSettings(@CurrentUserId() userId: bigint) {
    return { data: await this.periodService.getReminderSettings(userId) };
  }

  @Patch('reminders')
  async updateReminderSettings(
    @Body() body: Parameters<PeriodService['updateReminderSettings']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return { data: await this.periodService.updateReminderSettings(userId, body) };
  }

  @Patch('permissions')
  async updatePermissions(
    @Body() body: Parameters<PeriodService['updatePermissions']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return { data: await this.periodService.updatePermissions(userId, body) };
  }

  @Get('permissions')
  async getPermissions(@CurrentUserId() userId: bigint) {
    return { data: await this.periodService.getPermissions(userId) };
  }
}
