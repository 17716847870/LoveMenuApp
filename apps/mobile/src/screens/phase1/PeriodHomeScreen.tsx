import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeaderBlock } from '../../components/PageHeaderBlock';
import { useAppDialog } from '../../components/AppDialog';
import { DateBottomSheetPicker } from '../../components/DateBottomSheetPicker';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { RootStackParamList, RootTabParamList } from '../../navigation/AppNavigator';
import {
  formatPeriodMonthTitle,
  periodCalendarMonthEmpty,
  periodDailyRecordDraftEmpty,
  periodHomeOverviewEmpty,
} from '../../utils/periodEmptyState';
import { periodApi } from '../../services/periodApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodCalendarMonthDto, PeriodDailyRecordDraftDto, PeriodHomeOverviewDto } from '../../types/period';
import { getPhaseAccentColor, periodPhasePalette } from '../../utils/periodPhasePalette';
import { PeriodHomeFemaleView } from './PeriodHomeFemaleView';
import { PeriodHomeMaleView } from './PeriodHomeMaleView';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Period'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function PeriodHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, partnerUser } = useAppStore();
  const [overview, setOverview] = useState<PeriodHomeOverviewDto>(periodHomeOverviewEmpty);
  const [dailyDraft, setDailyDraft] = useState<PeriodDailyRecordDraftDto>(periodDailyRecordDraftEmpty);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState<PeriodCalendarMonthDto>(() => periodCalendarMonthEmpty());

  const calendarYear = currentMonthDate.getFullYear();
  const calendarMonthNumber = currentMonthDate.getMonth() + 1;
  const monthTitle = useMemo(
    () => formatPeriodMonthTitle(calendarYear, calendarMonthNumber),
    [calendarMonthNumber, calendarYear],
  );
  const currentMonthKey = `${calendarYear}-${String(calendarMonthNumber).padStart(2, '0')}`;
  const todayDate = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => toDateKey(new Date()), []);
  const maxPreviewMonthDate = useMemo(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth() + 6, 1),
    [todayDate],
  );
  const canGoNextMonth =
    currentMonthDate.getFullYear() < maxPreviewMonthDate.getFullYear() ||
    (currentMonthDate.getFullYear() === maxPreviewMonthDate.getFullYear() &&
      currentMonthDate.getMonth() < maxPreviewMonthDate.getMonth());
  const currentPhaseAccent = getPhaseAccentColor(overview.currentPhaseKey);
  const nextPeriodAccent = periodPhasePalette.luteal;
  const ovulationAccent = periodPhasePalette.ovulation;
  const isFemaleViewer = (currentUser?.gender ?? 'female') === 'female';
  const isMaleFullAccess =
    !isFemaleViewer && overview.maleAccessGranted && overview.maleViewEnabled && overview.maleEditEnabled;
  const partnerNickname = partnerUser?.nickname ?? '另一半';
  const [initialCycles, setInitialCycles] = useState(() => buildDefaultInitialCycles());
  const [initialDatePickerTarget, setInitialDatePickerTarget] = useState<{
    index: number;
    key: 'startedOn' | 'endedOn';
  } | null>(null);
  const [isSavingInitialCycles, setIsSavingInitialCycles] = useState(false);

  useEffect(() => {
    if (!overview.needsInitialCycles) {
      return;
    }

    setInitialCycles(buildDefaultInitialCycles());
  }, [overview.needsInitialCycles]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      periodApi
        .getHomeOverview()
        .then(async (overviewResponse) => {
          if (!mounted) {
            return;
          }

          setOverview(overviewResponse.data);

          const viewerIsFemale = (currentUser?.gender ?? 'female') === 'female';
          const canEditPeriod =
            viewerIsFemale || (overviewResponse.data.maleAccessGranted && overviewResponse.data.maleEditEnabled);
          const canViewCalendar =
            viewerIsFemale || (overviewResponse.data.maleAccessGranted && overviewResponse.data.maleViewEnabled);

          if (!canViewCalendar) {
            return;
          }

          const selectedRecordDateResponse = await periodApi.getSelectedRecordDate();
          const selectedRecordDate = selectedRecordDateResponse.data || todayDateKey;

          const calendarResponse = await periodApi.getCalendarMonth(calendarYear, calendarMonthNumber);
          if (mounted) {
            setCalendarMonth(calendarResponse.data);
          }

          if (!canEditPeriod) {
            return;
          }

          const draftResponse = await periodApi.getDailyRecordDraft(selectedRecordDate);
          if (mounted) {
            setDailyDraft(draftResponse.data);
          }
        })
        .catch(() => undefined);

      return () => {
        mounted = false;
      };
    }, [calendarMonthNumber, calendarYear, currentUser?.gender, todayDateKey]),
  );

  const refreshCurrentCalendarMonth = async () => {
    const response = await periodApi.getCalendarMonth(calendarYear, calendarMonthNumber);
    setCalendarMonth(response.data);
  };

  const handleConfirmPeriodStarted = async () => {
    if (!isFemaleViewer) {
      dialog.alert('无法调整', '只有女方可以确认经期开始或结束。');
      return;
    }

    try {
      const response = await periodApi.confirmPeriodStarted(dailyDraft.recordDate);
      setOverview(response.data);
      const draftResponse = await periodApi.getDailyRecordDraft(dailyDraft.recordDate);
      setDailyDraft(draftResponse.data);
      await refreshCurrentCalendarMonth();
    } catch {
      dialog.alert('无法确认开始', '这一天可能和已有经期记录冲突，请换一个日期或先检查历史记录。');
    }
  };

  const handleConfirmPeriodEnded = async () => {
    if (!isFemaleViewer) {
      dialog.alert('无法调整', '只有女方可以确认经期开始或结束。');
      return;
    }

    try {
      const response = await periodApi.confirmPeriodEnded(dailyDraft.recordDate);
      setOverview(response.data);
      const draftResponse = await periodApi.getDailyRecordDraft(dailyDraft.recordDate);
      setDailyDraft(draftResponse.data);
      await refreshCurrentCalendarMonth();
    } catch {
      dialog.alert('无法确认结束', '结束日期不能早于本次经期开始日，请重新选择日期。');
    }
  };

  const handleSelectCalendarDay = async (day: number) => {
    const selectedDate = `${currentMonthKey}-${String(day).padStart(2, '0')}`;
    const draftResponse = await periodApi.getDailyRecordDraft(selectedDate);
    setDailyDraft(draftResponse.data);
    await refreshCurrentCalendarMonth();
  };

  const goToPreviousMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    if (!canGoNextMonth) {
      return;
    }
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isFutureCalendarDay = (day: number) => {
    const dateKey = `${currentMonthKey}-${String(day).padStart(2, '0')}`;
    return dateKey > todayDateKey;
  };

  const handleInitialCycleChange = (index: number, key: 'startedOn' | 'endedOn', value: string) => {
    setInitialCycles((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  };

  const handleInitialDateConfirm = (date: Date) => {
    if (!initialDatePickerTarget) {
      return;
    }

    handleInitialCycleChange(initialDatePickerTarget.index, initialDatePickerTarget.key, toDateKey(date));
  };

  const handleSubmitInitialCycles = async () => {
    if (initialCycles.some((item) => !isDateText(item.startedOn) || !isDateText(item.endedOn))) {
      dialog.alert('日期还没选完整', '请依次选择最近三次经期的开始日期和结束日期。');
      return;
    }

    try {
      setIsSavingInitialCycles(true);
      const response = await periodApi.saveInitialCycles(initialCycles);
      setOverview(response.data);
      const draftResponse = await periodApi.getDailyRecordDraft();
      const calendarResponse = await periodApi.getCalendarMonth(calendarYear, calendarMonthNumber);
      setDailyDraft(draftResponse.data);
      setCalendarMonth(calendarResponse.data);
    } catch {
      dialog.alert('保存失败', '请检查日期是否完整，结束日期不能早于开始日期。');
    } finally {
      setIsSavingInitialCycles(false);
    }
  };

  const handlePressDailyRecord = () => {
    navigation.navigate('PeriodDailyRecord');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <PageHeaderBlock
        title={overview.appName}
        subtitle="记录周期里的温柔变化"
        titleColor={theme.colors.primary}
        subtitleColor={theme.colors.textSoft}
        style={[styles.pageHeader, { marginTop: insets.top }]}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 132 }]} showsVerticalScrollIndicator={false}>
        {isFemaleViewer && overview.needsInitialCycles ? (
          <View
            style={[
              styles.initialCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder },
            ]}
          >
            <Text style={[styles.initialTitle, { color: theme.colors.text }]}>先填写最近 3 个月经期</Text>
            <Text style={[styles.initialDesc, { color: theme.colors.textMuted }]}>
              按从早到近填写最近三次经期。开始日期是来月经第一天，结束日期是这次经期完全结束的那一天。
            </Text>
            <View style={styles.initialList}>
              {initialCycles.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.initialRow,
                    { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surfaceAlt },
                  ]}
                >
                  <Text style={[styles.initialRowTitle, { color: theme.colors.text }]}>
                    第 {index + 1} 次{getInitialCycleHint(index)}
                  </Text>
                  <View style={styles.initialInputs}>
                    <View style={styles.initialField}>
                      <Text style={[styles.initialFieldLabel, { color: theme.colors.textMuted }]}>月经开始日期</Text>
                      <Pressable
                        style={[styles.initialInput, { borderColor: theme.colors.cardBorder }]}
                        onPress={() => setInitialDatePickerTarget({ index, key: 'startedOn' })}
                      >
                        <Text
                          style={[
                            styles.initialInputText,
                            { color: item.startedOn ? theme.colors.text : theme.colors.textSoft },
                          ]}
                        >
                          {item.startedOn || '请选择'}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.initialField}>
                      <Text style={[styles.initialFieldLabel, { color: theme.colors.textMuted }]}>月经结束日期</Text>
                      <Pressable
                        style={[styles.initialInput, { borderColor: theme.colors.cardBorder }]}
                        onPress={() => setInitialDatePickerTarget({ index, key: 'endedOn' })}
                      >
                        <Text
                          style={[
                            styles.initialInputText,
                            { color: item.endedOn ? theme.colors.text : theme.colors.textSoft },
                          ]}
                        >
                          {item.endedOn || '请选择'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            <RomanticGradientButton
              title={isSavingInitialCycles ? '保存中...' : '保存并开始预测'}
              onPress={handleSubmitInitialCycles}
            />
          </View>
        ) : isFemaleViewer || isMaleFullAccess ? (
          <PeriodHomeFemaleView
            overview={overview}
            dailyDraft={dailyDraft}
            calendarMonth={calendarMonth}
            monthTitle={monthTitle}
            canGoNextMonth={canGoNextMonth}
            currentPhaseAccent={currentPhaseAccent}
            nextPeriodAccent={nextPeriodAccent}
            ovulationAccent={ovulationAccent}
            canAdjustPeriodCycle={isFemaleViewer}
            onConfirmPeriodStarted={handleConfirmPeriodStarted}
            onConfirmPeriodEnded={handleConfirmPeriodEnded}
            onSelectDay={handleSelectCalendarDay}
            dayDisabled={isFutureCalendarDay}
            onPrevMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
            onPressPrediction={() => navigation.navigate('Prediction')}
            onPressDailyRecord={handlePressDailyRecord}
            onPressDailySummary={() => navigation.navigate('PeriodDailySummary')}
            onPressCycleSettings={() => navigation.navigate('PeriodCycleSettings')}
            onPressHistoryCycle={() => navigation.navigate('PeriodHistoryCycleEditor', { date: dailyDraft.recordDate })}
            onPressPeriodAnalysis={() => navigation.navigate('PeriodAnalysis')}
            onPressReminders={() => navigation.navigate('Reminders')}
            onPressAuthorization={() => navigation.navigate('Authorization')}
            showRemindersTool={isFemaleViewer}
            showAuthorizationTool={isFemaleViewer}
          />
        ) : (
          <PeriodHomeMaleView
            overview={overview}
            partnerNickname={partnerNickname}
            partnerAvatarUrl={partnerUser?.avatar_url ?? undefined}
            onPressAuthorization={() => navigation.navigate('Authorization')}
            onPressPeriodAnalysis={() => navigation.navigate('PeriodAnalysis')}
          />
        )}
      </ScrollView>

      <DateBottomSheetPicker
        visible={Boolean(initialDatePickerTarget)}
        value={
          initialDatePickerTarget
            ? parseDateKey(initialCycles[initialDatePickerTarget.index][initialDatePickerTarget.key])
            : undefined
        }
        title={initialDatePickerTarget?.key === 'endedOn' ? '选择结束日期' : '选择开始日期'}
        onClose={() => setInitialDatePickerTarget(null)}
        onConfirm={handleInitialDateConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  pageHeader: { marginBottom: 5, marginLeft: 24 },
  initialCard: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  initialTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  initialDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
  },
  initialList: {
    marginTop: 18,
    gap: 12,
    marginBottom: 18,
  },
  initialRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  initialRowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  initialInputs: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  initialField: {
    flex: 1,
    gap: 6,
  },
  initialFieldLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  initialInput: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  initialInputText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

function buildDefaultInitialCycles() {
  return Array.from({ length: 3 }, () => ({
    startedOn: '',
    endedOn: '',
  }));
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  if (!value) {
    return undefined;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function getInitialCycleHint(index: number) {
  if (index === 0) {
    return '（最早的一次）';
  }

  if (index === 2) {
    return '（最近的一次）';
  }

  return '';
}

function isDateText(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
