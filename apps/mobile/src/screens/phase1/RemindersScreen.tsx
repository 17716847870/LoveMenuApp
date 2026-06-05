import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, Clock3, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSwitch } from '../../components/AppSwitch';
import { useAppDialog } from '../../components/AppDialog';
import { PillSelector } from '../../components/PillSelector';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { TimeBottomSheetPicker } from '../../components/TimeBottomSheetPicker';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { periodApi } from '../../services/periodApi';
import { syncLocalNotificationSchedules } from '../../services/pushNotifications';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodReminderSettingsDto } from '../../types/period';
import { periodReminderSettingsEmpty } from '../../utils/periodEmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'Reminders'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function RemindersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const notificationSettings = useAppStore((state) => state.notificationSettings);
  const [settings, setSettings] = useState<PeriodReminderSettingsDto>(periodReminderSettingsEmpty);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    periodApi.getReminderSettings().then((response) => {
      if (mounted) {
        setSettings(response.data);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = (patch: Partial<PeriodReminderSettingsDto>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (typeof patch.periodStartReminderOffsetDays === 'number') {
        next.previewText = buildPreviewText(patch.periodStartReminderOffsetDays);
      }
      return next;
    });
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await periodApi.updateReminderSettings(settings);
      setSettings(response.data);
      void syncLocalNotificationSchedules(notificationSettings);
      dialog.alert('保存成功', '提醒时间和提醒规则已经同步到后端。');
    } catch {
      dialog.alert('保存失败', '提醒设置暂时没有保存成功，请稍后再试。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="提醒设置" subtitle="管理周期提醒和贴心提示" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>生理期提醒</Text>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>经期开始提醒</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.textMuted }]}>提前准备，避免尴尬</Text>
            </View>
            <AppSwitch
              value={settings.periodStartReminderEnabled}
              onValueChange={(value) => updateSettings({ periodStartReminderEnabled: value })}
            />
          </View>

          <PillSelector
            items={[
              { key: '1', label: '1天' },
              { key: '2', label: '2天' },
              { key: '3', label: '3天' },
              { key: '5', label: '5天' },
            ]}
            value={String(settings.periodStartReminderOffsetDays)}
            onChange={(value) => updateSettings({ periodStartReminderOffsetDays: Number(value) })}
            layout="wrap"
            activeTextColor={theme.colors.badgeText}
            contentContainerStyle={styles.dayOptions}
            pillStyle={styles.filterPill}
            textStyle={styles.filterPillText}
          />

          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>预计经期到来提醒</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.textMuted }]}>到了时间及时记录与准备</Text>
            </View>
            <AppSwitch
              value={settings.periodDueReminderEnabled}
              onValueChange={(value) => updateSettings({ periodDueReminderEnabled: value })}
            />
          </View>

          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>经期结束记录提醒</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.textMuted }]}>提醒补全结束时间，保持周期完整</Text>
            </View>
            <AppSwitch
              value={settings.periodEndReminderEnabled}
              onValueChange={(value) => updateSettings({ periodEndReminderEnabled: value })}
            />
          </View>
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>提醒时间</Text>
          <Pressable style={styles.timeRow} onPress={() => setTimePickerVisible(true)}>
            <Clock3 size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.timeText, { color: theme.colors.text }]}>
              每日通知时间 {settings.reminderTimeLabel}
            </Text>
            <ChevronRight size={18} color={theme.colors.textSoft} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View
          style={[
            styles.previewCard,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <View style={styles.previewHeader}>
            <Heart size={16} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.1} />
            <Text style={[styles.previewBrand, { color: theme.colors.primary }]}>LoveMenu 温馨提示</Text>
          </View>
          <Text style={[styles.previewText, { color: theme.colors.textMuted }]}>{settings.previewText}</Text>
        </View>

        <RomanticGradientButton
          title={isSaving ? '保存中...' : '保存设置'}
          onPress={saveSettings}
          disabled={isSaving}
        />
      </ScrollView>
      <TimeBottomSheetPicker
        visible={timePickerVisible}
        value={{ hour: settings.reminderHour, minute: settings.reminderMinute, second: 0 }}
        title="选择每日通知时间"
        showSecond={false}
        onClose={() => setTimePickerVisible(false)}
        onConfirm={(time) =>
          updateSettings({
            reminderHour: time.hour,
            reminderMinute: time.minute,
            reminderTimeLabel: formatReminderTimeLabel(time.hour, time.minute),
          })
        }
      />
    </View>
  );
}

function formatReminderTimeLabel(hour: number, minute: number) {
  const period = hour < 12 ? '上午' : '下午';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildPreviewText(offsetDays: number) {
  return `预计经期前 ${offsetDays} 天提醒，记得提前准备，照顾好自己。`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600', textAlign: 'center', marginBottom: 18 },
  panel: { borderRadius: 24, borderWidth: 1, padding: 18, marginBottom: 16, gap: 18 },
  panelTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  rowDesc: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  dayOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  dayChipText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeText: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  previewCard: { borderRadius: 24, borderWidth: 1, padding: 18, marginBottom: 18 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  previewBrand: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  previewText: { fontSize: 14, lineHeight: 22 },
  filterPill: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  filterPillText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
