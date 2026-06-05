import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDialog } from '../../components/AppDialog';
import { PillSelector } from '../../components/PillSelector';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { periodApi } from '../../services/periodApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodHomeOverviewDto } from '../../types/period';
import { periodHomeOverviewEmpty } from '../../utils/periodEmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'PeriodCycleSettings'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function shiftDateLocal(dateString: string, delta: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function PeriodCycleSettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const currentUser = useAppStore((state) => state.currentUser);
  const [overview, setOverview] = useState<PeriodHomeOverviewDto>(periodHomeOverviewEmpty);
  const [hasLoaded, setHasLoaded] = useState(false);

  const canManage = currentUser?.gender === 'female';
  const currentStartDate = overview.actualPeriodStartDate ?? '';
  const canAdjustCurrentCycle = canManage && overview.isPeriodConfirmed && Boolean(currentStartDate);

  useEffect(() => {
    let mounted = true;

    periodApi.getHomeOverview().then((response) => {
      if (mounted) {
        setOverview(response.data);
        setHasLoaded(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !hasLoaded) {
      return;
    }

    if (!canManage) {
      dialog.alert('无法设置', '只有女方可以调整本次经期设置。', [
        { text: '知道了', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    if (!overview.isPeriodConfirmed || !overview.actualPeriodStartDate) {
      dialog.alert('当前没有进行中的经期', '确认本次经期开始后，才能调整本次经期设置。', [
        { text: '知道了', onPress: () => navigation.goBack() },
      ]);
    }
  }, [canManage, currentUser, dialog, hasLoaded, navigation, overview.actualPeriodStartDate, overview.isPeriodConfirmed]);

  const handleChangeStartDate = async (delta: number) => {
    if (!canAdjustCurrentCycle) return;

    const response = await periodApi.updateCurrentCycleStartDate(shiftDateLocal(currentStartDate, delta));
    setOverview(response.data.overview);
  };

  const handleChangeAlignmentMode = async (mode: 'auto' | 'manual') => {
    if (!canAdjustCurrentCycle) return;

    const response = await periodApi.updateRecordingMode(mode);
    setOverview(response.data);
  };

  const handleClearCycleRecords = async () => {
    if (!canAdjustCurrentCycle) return;

    dialog.confirm({
      title: '确认清空本次经期记录？',
      message: '清空后，本次经期下已保存的每日记录会被移除。',
      actions: [
        { text: '取消', style: 'cancel' },
        {
          text: '确认清空',
          style: 'destructive',
          onPress: async () => {
            const response = await periodApi.clearCurrentCycleRecords();
            setOverview(response.data.overview);
          },
        },
      ],
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="本次经期设置" subtitle="调整本次经期开始日期和记录方式" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>经期开始日期</Text>
            <Text style={[styles.sectionDesc, { color: theme.colors.textMuted }]}>
              只调整本次正在进行的经期开始日，不会修改历史周期。
            </Text>
          </View>

          <View
            style={[
              styles.datePill,
              { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.5) },
            ]}
          >
            <Pressable hitSlop={12} onPress={() => handleChangeStartDate(-1)} disabled={!canAdjustCurrentCycle}>
              <ChevronLeft size={22} color={theme.colors.textSoft} />
            </Pressable>
            <Text style={[styles.dateText, { color: theme.colors.text }]}>{currentStartDate || '未开始'}</Text>
            <Pressable hitSlop={12} onPress={() => handleChangeStartDate(1)} disabled={!canAdjustCurrentCycle}>
              <ChevronRight size={22} color={theme.colors.textSoft} />
            </Pressable>
          </View>

          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>记录时间对齐方式</Text>
            <PillSelector
              items={[
                { key: 'auto' as const, label: '自动对齐' },
                { key: 'manual' as const, label: '手动选择' },
              ]}
              value={overview.recordingMode}
              onChange={handleChangeAlignmentMode}
              layout="wrap"
              activeTextColor={theme.colors.badgeText}
              contentContainerStyle={styles.alignModeRow}
            />
            <Text style={[styles.helperText, { color: theme.colors.textSoft }]}>
              {overview.recordingMode === 'auto'
                ? '调整开始日期后，本次经期里已经记录过的日期会整体平移。'
                : '调整开始日期后，已记录日期保持不变，你可以自己回到具体日期补录或修改。'}
            </Text>
          </View>

          <View
            style={[
              styles.metaCard,
              { backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.72), borderColor: withAlpha(theme.colors.cardBorder, 0.45) },
            ]}
          >
            <Text style={[styles.metaTitle, { color: theme.colors.text }]}>已记录 {overview.currentCycleRecordedDates.length} 天</Text>
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
              {overview.currentCycleRecordedDates.length > 0
                ? overview.currentCycleRecordedDates.join('、')
                : '本次经期还没有记录任何一天。'}
            </Text>
          </View>

          <Pressable
            style={[
              styles.clearButton,
              { borderColor: withAlpha(theme.colors.cardBorder, 0.6), backgroundColor: withAlpha(theme.colors.primarySoft, 0.08) },
            ]}
            onPress={handleClearCycleRecords}
            disabled={!canAdjustCurrentCycle}
          >
            <Text style={[styles.clearButtonText, { color: theme.colors.primary }]}>清空本次经期记录，重新开始</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 22,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  sectionDesc: { marginTop: 6, fontSize: 13, lineHeight: 19 },
  datePill: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateText: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  alignModeRow: { gap: 10, marginTop: 12 },
  helperText: { marginTop: 8, fontSize: 13, lineHeight: 20 },
  metaCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metaTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  clearButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  clearButtonText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
});
