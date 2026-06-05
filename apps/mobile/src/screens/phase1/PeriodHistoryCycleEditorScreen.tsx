import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateBottomSheetPicker } from '../../components/DateBottomSheetPicker';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { periodApi } from '../../services/periodApi';
import { useAppDialog } from '../../components/AppDialog';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodHistoryCycleDto } from '../../types/period';

type Props = NativeStackScreenProps<RootStackParamList, 'PeriodHistoryCycleEditor'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function PeriodHistoryCycleEditorScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const [cycle, setCycle] = useState<PeriodHistoryCycleDto | null>(null);
  const [startedOn, setStartedOn] = useState('');
  const [endedOn, setEndedOn] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'startedOn' | 'endedOn' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    periodApi
      .getHistoryCycle(route.params.date)
      .then((response) => {
        if (!mounted) return;
        setCycle(response.data);
        setStartedOn(response.data.startedOn);
        setEndedOn(response.data.endedOn);
      })
      .catch(() => {
        dialog.alert('无法读取历史经期', '这一天可能不属于已完成的历史经期。', [
          { text: '知道了', onPress: () => navigation.goBack() },
        ]);
      });

    return () => {
      mounted = false;
    };
  }, [dialog, navigation, route.params.date]);

  const hasChanged = Boolean(cycle && (startedOn !== cycle.startedOn || endedOn !== cycle.endedOn));

  const handleSave = async () => {
    if (!cycle || !hasChanged || isSaving) return;

    if (!isDateText(startedOn) || !isDateText(endedOn)) {
      dialog.alert('日期不完整', '请选择历史经期的开始日期和结束日期。');
      return;
    }

    if (endedOn < startedOn) {
      dialog.alert('日期不合理', '结束日期不能早于开始日期。');
      return;
    }

    try {
      setIsSaving(true);
      const preview = await periodApi.previewHistoryCycleAdjustment({ cycleId: cycle.cycleId, startedOn, endedOn });
      setIsSaving(false);
      dialog.confirm({
        title: '调整后如何处理已有记录？',
        message: buildPreviewMessage(preview.data),
        actions: [
          { text: '取消', style: 'cancel' },
          {
            text: '自动同步为新天数',
            onPress: () => void saveWithStrategy('recalculate'),
          },
          {
            text: '保留原填写语义',
            onPress: () => void saveWithStrategy('preserve'),
          },
        ],
      });
    } catch {
      setIsSaving(false);
      dialog.alert('无法调整', '这段日期可能与其他经期重叠，或包含未来日期。请重新选择。');
    }
  };

  const saveWithStrategy = async (cycleDayStrategy: 'recalculate' | 'preserve') => {
    if (!cycle) return;

    try {
      setIsSaving(true);
      const response = await periodApi.updateHistoryCycle({
        cycleId: cycle.cycleId,
        startedOn,
        endedOn,
        cycleDayStrategy,
      });
      setCycle(response.data);
      setStartedOn(response.data.startedOn);
      setEndedOn(response.data.endedOn);
      dialog.alert('已保存', '历史经期起止日期已更新。');
    } catch {
      dialog.alert('保存失败', '这段日期可能与其他经期重叠，或包含未来日期。请重新选择。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader
        title="调整历史经期"
        subtitle="修改已完成经期的开始和结束日期"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.5) }]}>
              <CalendarDays size={20} color={theme.colors.primary} strokeWidth={2.3} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{cycle?.title ?? '正在读取历史经期'}</Text>
              <Text style={[styles.desc, { color: theme.colors.textMuted }]}>
                {cycle?.description ?? '系统正在同步所选日期所属的历史经期。'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldStack}>
            <DateField label="开始日期" value={startedOn || '请选择'} onPress={() => setPickerTarget('startedOn')} />
            <DateField label="结束日期" value={endedOn || '请选择'} onPress={() => setPickerTarget('endedOn')} />
          </View>

          <View
            style={[
              styles.metaCard,
              {
                backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.72),
                borderColor: withAlpha(theme.colors.cardBorder, 0.45),
              },
            ]}
          >
            <Text style={[styles.metaTitle, { color: theme.colors.text }]}>已记录日期</Text>
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {cycle?.recordedDates.length ? cycle.recordedDates.join('、') : '这次经期还没有绑定每日记录。'}
            </Text>
          </View>

          <RomanticGradientButton
            title={isSaving ? '保存中...' : hasChanged ? '保存调整' : '暂无改动'}
            onPress={handleSave}
            disabled={!hasChanged || isSaving}
          />
        </View>
      </ScrollView>

      <DateBottomSheetPicker
        visible={Boolean(pickerTarget)}
        value={pickerTarget ? parseDateKey(pickerTarget === 'startedOn' ? startedOn : endedOn) : undefined}
        title={pickerTarget === 'startedOn' ? '选择开始日期' : '选择结束日期'}
        onClose={() => setPickerTarget(null)}
        onConfirm={(date) => {
          const value = toDateKey(date);
          if (pickerTarget === 'startedOn') {
            setStartedOn(value);
          }
          if (pickerTarget === 'endedOn') {
            setEndedOn(value);
          }
        }}
      />
    </View>
  );
}

function DateField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <Pressable
      style={[styles.dateField, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.cardBorder }]}
      onPress={onPress}
    >
      <Text style={[styles.dateLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.dateValue, { color: theme.colors.text }]}>{value}</Text>
    </Pressable>
  );
}

function buildPreviewMessage(preview: {
  summary: string;
  affectedRecords: Array<{ date: string; oldCycleDay: number | null; newCycleDay: number | null }>;
  movedOutDates: string[];
  movedInDates: string[];
}) {
  const changes = preview.affectedRecords
    .slice(0, 4)
    .map((item) => `${formatDateLabel(item.date)}：第${item.oldCycleDay ?? '-'}天 -> 第${item.newCycleDay ?? '-'}天`);
  const extraCount = Math.max(0, preview.affectedRecords.length - changes.length);
  const lines = [preview.summary, ...changes];
  if (extraCount > 0) {
    lines.push(`另有 ${extraCount} 条记录会受影响。`);
  }
  if (preview.movedInDates.length > 0) {
    lines.push(`${preview.movedInDates.map(formatDateLabel).join('、')} 会纳入这次经期。`);
  }
  if (preview.movedOutDates.length > 0) {
    lines.push(`${preview.movedOutDates.map(formatDateLabel).join('、')} 会转为日常记录。`);
  }
  lines.push('自动同步适合修正真实日期；保留原填写语义适合已有记录确实按原第几天填写。');
  return lines.join('\n');
}

function formatDateLabel(value: string) {
  const [, monthText, dayText] = value.split('-');
  return `${Number(monthText)}月${Number(dayText)}日`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  if (!value) return undefined;
  const [yearText, monthText, dayText] = value.split('-');
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function isDateText(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '800' },
  desc: { marginTop: 6, fontSize: 13, lineHeight: 20 },
  fieldStack: { gap: 12 },
  dateField: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  dateLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  dateValue: { marginTop: 4, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  metaCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metaTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  metaText: { marginTop: 6, fontSize: 13, lineHeight: 20 },
});
