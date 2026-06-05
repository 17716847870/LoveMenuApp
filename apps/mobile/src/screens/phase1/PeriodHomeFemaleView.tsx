import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BellRing, CalendarDays, ChevronRight, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react-native';

import { PeriodMonthCalendarCard } from '../../components/PeriodMonthCalendarCard';
import { PeriodStatusActionCard } from '../../components/PeriodStatusActionCard';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodCalendarMonthDto, PeriodDailyRecordDraftDto, PeriodHomeOverviewDto } from '../../types/period';

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

type Props = {
  overview: PeriodHomeOverviewDto;
  dailyDraft: PeriodDailyRecordDraftDto;
  calendarMonth: PeriodCalendarMonthDto;
  monthTitle: string;
  canGoNextMonth: boolean;
  currentPhaseAccent: string;
  nextPeriodAccent: string;
  ovulationAccent: string;
  canAdjustPeriodCycle: boolean;
  onConfirmPeriodStarted: () => void;
  onConfirmPeriodEnded: () => void;
  onSelectDay: (day: number) => void;
  dayDisabled: (day: number) => boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPressPrediction: () => void;
  onPressDailyRecord: () => void;
  onPressDailySummary: () => void;
  onPressCycleSettings: () => void;
  onPressHistoryCycle: () => void;
  onPressPeriodAnalysis: () => void;
  onPressReminders: () => void;
  onPressAuthorization: () => void;
  showRemindersTool?: boolean;
  showAuthorizationTool?: boolean;
};

export function PeriodHomeFemaleView({
  overview,
  dailyDraft,
  calendarMonth,
  monthTitle,
  canGoNextMonth,
  currentPhaseAccent,
  nextPeriodAccent,
  ovulationAccent,
  canAdjustPeriodCycle,
  onConfirmPeriodStarted,
  onConfirmPeriodEnded,
  onSelectDay,
  dayDisabled,
  onPrevMonth,
  onNextMonth,
  onPressPrediction,
  onPressDailyRecord,
  onPressDailySummary,
  onPressCycleSettings,
  onPressHistoryCycle,
  onPressPeriodAnalysis,
  onPressReminders,
  onPressAuthorization,
  showRemindersTool = true,
  showAuthorizationTool = true,
}: Props) {
  const theme = useAppTheme();

  const canRecordToday = true;
  const isPeriodRecord = dailyDraft.isPeriodDay;
  const selectedDateHasRecord =
    dailyDraft.hasRecord || overview.currentCycleRecordedDates.includes(dailyDraft.recordDate);
  const todaySummaryItems = buildSummaryItems(dailyDraft, overview.mood, isPeriodRecord);
  const showTodaySummary = selectedDateHasRecord && todaySummaryItems.length > 0;
  const ctaTitle = selectedDateHasRecord ? '去编辑这一天记录' : isPeriodRecord ? '记录这一天状况' : '记录日常状态';
  const recordPanelTitle = isPeriodRecord ? '所选日期经期记录' : '所选日期身体记录';
  const selectedDateLabel = dailyDraft.recordDate === toDateKey(new Date()) ? '今天' : dailyDraft.recordDate;

  return (
    <>
      <PeriodMonthCalendarCard
        themeColors={theme.colors}
        monthTitle={monthTitle}
        monthData={calendarMonth}
        canGoNext={canGoNextMonth}
        selectedDate={dailyDraft.recordDate}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onSelectDay={onSelectDay}
        dayDisabled={dayDisabled}
      />

      <View style={styles.bentoGrid}>
        <Pressable
          style={[
            styles.bentoCardLarge,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
          onPress={onPressPrediction}
        >
          <View style={styles.bentoOrbWrap}>
            <Text style={[styles.bentoOrb, { color: withAlpha(nextPeriodAccent, 0.18) }]}>💧</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: withAlpha(nextPeriodAccent, 0.14) }]}>
            <CalendarDays size={14} color={nextPeriodAccent} strokeWidth={2.2} />
            <Text style={[styles.badgeText, { color: nextPeriodAccent }]}>下次经期</Text>
          </View>
          <Text style={[styles.bentoValue, { color: theme.colors.text }]}>{overview.nextPeriodDateLabel}</Text>
          <Text style={[styles.bentoHint, { color: theme.colors.textMuted }]}>
            预计持续 {overview.periodDuration} 天
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.bentoCardSmall,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
          onPress={onPressPrediction}
        >
          <View style={styles.bentoOrbWrap}>
            <Text style={[styles.bentoOrb, { color: withAlpha(ovulationAccent, 0.2) }]}>✿</Text>
          </View>
          <Sparkles size={16} color={ovulationAccent} strokeWidth={2.2} />
          <Text style={[styles.bentoLabel, { color: theme.colors.textMuted }]}>排卵预测</Text>
          <Text style={[styles.bentoSmallValue, { color: theme.colors.text }]}>{overview.ovulationRangeLabel}</Text>
          <Text style={[styles.bentoSmallHint, { color: theme.colors.textSoft }]}>受孕几率较高</Text>
        </Pressable>
      </View>

      {canAdjustPeriodCycle ? (
        <PeriodStatusActionCard
          dailyDraft={dailyDraft}
          accentColor={currentPhaseAccent}
          onConfirmStarted={onConfirmPeriodStarted}
          onConfirmEnded={onConfirmPeriodEnded}
          onPressDailyRecord={onPressDailyRecord}
          onPressCycleSettings={onPressCycleSettings}
          onPressHistoryCycle={onPressHistoryCycle}
        />
      ) : null}

      {canRecordToday ? (
        <Pressable
          style={[
            styles.recordCard,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
          onPress={onPressDailyRecord}
        >
          <View style={styles.recordHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{recordPanelTitle}</Text>
              <Text style={[styles.recordDateHint, { color: theme.colors.textSoft }]}>
                当前查看：{selectedDateLabel}
              </Text>
            </View>
            {showTodaySummary ? (
              <Pressable style={styles.inlineLink} onPress={onPressDailySummary}>
                <Text style={[styles.inlineLinkText, { color: currentPhaseAccent }]}>查看全部</Text>
                <ChevronRight size={14} color={currentPhaseAccent} strokeWidth={2.4} />
              </Pressable>
            ) : null}
          </View>
          {showTodaySummary ? (
            <View style={styles.recordSummaryGrid}>
              {todaySummaryItems.map((item, index) => (
                <Pressable
                  key={item.key}
                  style={[
                    styles.recordItem,
                    styles.recordSummaryItem,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: withAlpha(theme.colors.cardBorder, 0.55),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.recordIconWrap,
                      {
                        backgroundColor:
                          index % 2 === 0
                            ? withAlpha(theme.colors.secondarySoft, 0.8)
                            : withAlpha(theme.colors.primarySoft, 0.8),
                      },
                    ]}
                  >
                    <Text style={styles.recordEmoji}>{item.emoji}</Text>
                  </View>
                  <View style={styles.recordCopy}>
                    <Text
                      style={[styles.recordValue, { color: theme.colors.text }]}
                      numberOfLines={item.key === 'symptoms' ? 2 : 1}
                    >
                      {item.value}
                    </Text>
                    <Text style={[styles.recordLabel, { color: theme.colors.textSoft }]}>{item.label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.recordEmptyState,
                {
                  backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.72),
                  borderColor: withAlpha(theme.colors.cardBorder, 0.45),
                },
              ]}
            >
              <Text style={[styles.recordEmptyTitle, { color: theme.colors.text }]}>
                {isPeriodRecord
                  ? '这一天还没有记录状态，记得补充本次经期数据。'
                  : '不在经期也可以记录分泌物、情绪、睡眠、压力、饮食和备注。'}
              </Text>
            </View>
          )}
          <Pressable style={[styles.ctaButton, { backgroundColor: currentPhaseAccent }]} onPress={onPressDailyRecord}>
            <Text style={styles.ctaPlus}>{selectedDateHasRecord ? '✎' : '+'}</Text>
            <Text style={styles.ctaButtonText}>{ctaTitle}</Text>
          </Pressable>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.toolsCard,
          { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
        ]}
      >
        <View style={styles.toolsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>更多工具</Text>
          <Text style={[styles.toolsHint, { color: theme.colors.textSoft }]}>把周期管理串起来</Text>
        </View>
        <View style={styles.toolsGrid}>
          {canRecordToday ? (
            <ToolShortcut
              label="记录当天状态"
              icon={<CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />}
              onPress={onPressDailyRecord}
            />
          ) : null}
          <ToolShortcut
            label="周期分析"
            icon={<TrendingUp size={18} color={theme.colors.primary} strokeWidth={2.2} />}
            onPress={onPressPeriodAnalysis}
          />
          {canAdjustPeriodCycle && overview.isPeriodConfirmed ? (
            <ToolShortcut
              label="本次经期设置"
              icon={<CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />}
              onPress={onPressCycleSettings}
            />
          ) : null}
          {showRemindersTool ? (
            <ToolShortcut
              label="提醒设置"
              icon={<BellRing size={18} color={theme.colors.primary} strokeWidth={2.2} />}
              onPress={onPressReminders}
            />
          ) : null}
          {showAuthorizationTool ? (
            <ToolShortcut
              label="授权管理"
              icon={<ShieldCheck size={18} color={theme.colors.primary} strokeWidth={2.2} />}
              onPress={onPressAuthorization}
            />
          ) : null}
        </View>
      </View>
    </>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildSummaryItems(dailyDraft: PeriodDailyRecordDraftDto, mood: string, isPeriodRecord: boolean) {
  const items: Array<{ key: string; emoji: string; label: string; value: string }> = [];

  if (isPeriodRecord) {
    items.push(
      { key: 'mood', emoji: '☺', label: '情绪状态', value: mood },
      { key: 'flow', emoji: '💧', label: '流量记录', value: dailyDraft.flow },
      { key: 'pain', emoji: '🩺', label: '痛感等级', value: `${dailyDraft.painLevel}/3` },
    );
    if (dailyDraft.weightKg)
      items.push({ key: 'weight', emoji: '⚖', label: '体重数据', value: `${dailyDraft.weightKg} kg` });
    if (dailyDraft.temperature) {
      items.push({ key: 'temperature', emoji: '🌡', label: '体温数据', value: `${dailyDraft.temperature} °C` });
    }
    if (dailyDraft.symptoms.length > 0) {
      items.push({ key: 'symptoms', emoji: '✦', label: '症状记录', value: dailyDraft.symptoms.join('、') });
    }
    return items;
  }

  if (dailyDraft.mood && dailyDraft.mood !== '平静') {
    items.push({ key: 'mood', emoji: '☺', label: '情绪状态', value: dailyDraft.mood });
  }
  if (dailyDraft.dischargeType && dailyDraft.dischargeType !== '无明显变化') {
    items.push({ key: 'discharge', emoji: '💧', label: '分泌物变化', value: dailyDraft.dischargeType });
  }
  if (dailyDraft.skinStatus && dailyDraft.skinStatus !== '稳定') {
    items.push({ key: 'skin', emoji: '✦', label: '皮肤状态', value: dailyDraft.skinStatus });
  }
  if (dailyDraft.sleepQuality && dailyDraft.sleepQuality !== '一般') {
    items.push({ key: 'sleep', emoji: '☾', label: '睡眠状态', value: dailyDraft.sleepQuality });
  }
  if (dailyDraft.stressLevel > 0) {
    items.push({ key: 'stress', emoji: '↗', label: '压力情况', value: `${dailyDraft.stressLevel}/10` });
  }
  if (dailyDraft.dietStatus && dailyDraft.dietStatus !== '正常') {
    items.push({ key: 'diet', emoji: '♨', label: '饮食情况', value: dailyDraft.dietStatus });
  }
  if (dailyDraft.exerciseLevel && dailyDraft.exerciseLevel !== '低') {
    items.push({ key: 'exercise', emoji: '●', label: '运动情况', value: dailyDraft.exerciseLevel });
  }
  if (dailyDraft.weightKg)
    items.push({ key: 'weight', emoji: '⚖', label: '体重数据', value: `${dailyDraft.weightKg} kg` });
  if (dailyDraft.temperature) {
    items.push({ key: 'temperature', emoji: '🌡', label: '体温数据', value: `${dailyDraft.temperature} °C` });
  }
  if (dailyDraft.abnormalEvent) {
    items.push({ key: 'abnormal', emoji: '!', label: '异常事件', value: dailyDraft.abnormalEvent });
  }
  if (dailyDraft.note) {
    items.push({ key: 'note', emoji: '✎', label: '备注', value: dailyDraft.note });
  }

  return items;
}

function ToolShortcut({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <Pressable
      style={[
        styles.toolItem,
        { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.6) },
      ]}
      onPress={onPress}
    >
      <View style={[styles.toolIconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.5) }]}>{icon}</View>
      <Text style={[styles.toolLabel, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bentoGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  bentoCardLarge: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minHeight: 144,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bentoCardSmall: {
    width: 152,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bentoOrbWrap: { position: 'absolute', right: -14, bottom: -18 },
  bentoOrb: { fontSize: 92, lineHeight: 96 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  bentoValue: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  bentoHint: { fontSize: 13, lineHeight: 18 },
  bentoLabel: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  bentoSmallValue: { fontSize: 20, lineHeight: 24, fontWeight: '600' },
  bentoSmallHint: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  recordCard: { marginTop: 16, borderRadius: 12, borderWidth: 1, padding: 20 },
  recordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  recordDateHint: { marginTop: 4, fontSize: 12, lineHeight: 16 },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  inlineLinkText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  recordSummaryGrid: { marginTop: 12, gap: 10 },
  recordItem: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordSummaryItem: { minHeight: 68 },
  recordEmptyState: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  recordEmptyTitle: { fontSize: 14, lineHeight: 22 },
  recordIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  recordEmoji: { fontSize: 20, lineHeight: 22 },
  recordCopy: { flex: 1 },
  recordLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  recordValue: { fontSize: 16, lineHeight: 22, fontWeight: '700', marginBottom: 2 },
  ctaButton: {
    marginTop: 18,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPlus: { color: '#ffffff', fontSize: 18, lineHeight: 20, fontWeight: '700' },
  ctaButtonText: { color: '#ffffff', fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6 },
  toolsCard: { marginTop: 16, borderRadius: 12, borderWidth: 1, padding: 20 },
  toolsHeader: { marginBottom: 14 },
  toolsHint: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toolItem: {
    width: '48%',
    minHeight: 116,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  toolIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
