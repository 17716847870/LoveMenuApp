import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BellRing, CalendarDays, ChevronRight, Clock3, Heart, Repeat2, ScrollText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lunar, LunarMonth } from 'lunar-javascript';

import { DateBottomSheetPicker } from '../../components/DateBottomSheetPicker';
import { PillSelector } from '../../components/PillSelector';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { SingleSelectBottomSheetPicker, SingleSelectOption } from '../../components/SingleSelectBottomSheetPicker';
import { TimeBottomSheetPicker, TimeValue } from '../../components/TimeBottomSheetPicker';
import {
  AnniversaryPeriodType,
  AnniversaryPermissionType,
  AnniversaryRemindType,
  AnniversaryReminder,
  AnniversaryDateRuleType,
} from '../../types/anniversary';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { anniversaryApi } from '../../services/anniversaryApi';
import { syncLocalNotificationSchedules } from '../../services/pushNotifications';
import { useAppDialog } from '../../components/AppDialog';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'AnniversaryEditor'>;
type CalendarType = 'solar' | 'lunar';
type PickerSheet =
  | 'dateRuleType'
  | 'calendarType'
  | 'period'
  | 'advanceDays'
  | 'permission'
  | 'ruleMonth'
  | 'ruleWeekOfMonth'
  | 'ruleWeekday'
  | null;

const remindTypeOptions: Array<{ key: AnniversaryRemindType; label: string }> = [
  { key: 'single', label: '单次' },
  { key: 'multiple', label: '多次' },
  { key: 'repeat', label: '循环' },
];

const calendarTypeOptions: Array<SingleSelectOption<CalendarType>> = [
  { label: '国历', value: 'solar', description: '按公历日期创建提醒' },
  { label: '农历', value: 'lunar', description: '保存前会转换成国历提醒时间' },
];

const dateRuleTypeOptions: Array<SingleSelectOption<AnniversaryDateRuleType>> = [
  { label: '固定公历日期', value: 'fixed_solar', description: '例如每年 5 月 20 日' },
  { label: '固定农历日期', value: 'fixed_lunar', description: '例如每年农历七月初七' },
  { label: '某月第几个星期几', value: 'weekday_of_month', description: '例如每年 5 月第 2 个星期日' },
];

const monthOptions: Array<SingleSelectOption<number>> = Array.from({ length: 12 }, (_, index) => ({
  label: `${index + 1} 月`,
  value: index + 1,
}));

const weekOfMonthOptions: Array<SingleSelectOption<number>> = [1, 2, 3, 4, 5].map((value) => ({
  label: `第 ${value} 个`,
  value,
}));

const weekdayOptions: Array<SingleSelectOption<number>> = [
  { label: '星期日', value: 0 },
  { label: '星期一', value: 1 },
  { label: '星期二', value: 2 },
  { label: '星期三', value: 3 },
  { label: '星期四', value: 4 },
  { label: '星期五', value: 5 },
  { label: '星期六', value: 6 },
];

const periodOptions: Array<SingleSelectOption<AnniversaryPeriodType>> = [
  { label: '每年', value: 'yearly', description: '适合生日、相识纪念日' },
  { label: '半年', value: 'half_year', description: '每 6 个月提醒一次' },
  { label: '3 个月', value: 'quarter', description: '每季度提醒一次' },
  { label: '每月', value: 'monthly', description: '每月同一天提醒' },
  { label: '每周', value: 'weekly', description: '每周同一天提醒' },
  { label: '自定义天数', value: 'custom_days', description: '按自定义间隔提醒' },
];

const advanceDayOptions: Array<SingleSelectOption<number>> = [
  { label: '当天提醒', value: 0 },
  { label: '提前 1 天', value: 1 },
  { label: '提前 3 天', value: 3 },
  { label: '提前 7 天', value: 7 },
  { label: '提前 15 天', value: 15 },
  { label: '提前 30 天', value: 30 },
];

const permissionOptions: Array<SingleSelectOption<AnniversaryPermissionType>> = [
  { label: '仅自己可见', value: 'private', description: '对方看不到这个纪念日' },
  { label: '对方可见', value: 'partner_visible', description: '对方可以查看，不能编辑内容' },
  { label: '对方可编辑', value: 'partner_editable', description: '对方可以编辑内容，但不能修改权限' },
];

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function dateFromIso(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateFromOriginalCalendar(reminder?: AnniversaryReminder | null) {
  if (reminder?.originalCalendarYear && reminder.originalCalendarMonth && reminder.originalCalendarDay) {
    return new Date(reminder.originalCalendarYear, reminder.originalCalendarMonth - 1, reminder.originalCalendarDay);
  }

  return dateFromIso(reminder?.targetDate);
}

function timeFromIso(value?: string | null): TimeValue {
  const date = value ? new Date(value) : new Date();
  return { hour: date.getHours(), minute: date.getMinutes(), second: 0 };
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(time: TimeValue) {
  return `${pad(time.hour)}:${pad(time.minute)}`;
}

function getDateParts(date: Date) {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function toSolarDate(date: Date, calendarType: CalendarType) {
  const { year, month, day } = getDateParts(date);
  if (calendarType === 'solar') {
    return new Date(year, month - 1, day);
  }

  const solar = Lunar.fromYmd(year, month, day).getSolar();
  return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function diffCalendarDays(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

function combineDateTime(date: Date, time: TimeValue) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hour, time.minute, 0);
}

function formatPeriod(value: AnniversaryPeriodType) {
  return periodOptions.find((option) => option.value === value)?.label ?? value;
}

function formatCalendarType(value: CalendarType) {
  return calendarTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function formatDateRuleType(value: AnniversaryDateRuleType) {
  return dateRuleTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function formatAdvanceDays(days: number) {
  return advanceDayOptions.find((option) => option.value === days)?.label ?? `提前 ${days} 天`;
}

function formatPermission(value: AnniversaryPermissionType) {
  return permissionOptions.find((option) => option.value === value)?.label ?? value;
}

export function AnniversaryEditorScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, relationship } = useAppStore();
  const [reminder, setReminder] = useState<AnniversaryReminder | null>(null);
  const isEditing = Boolean(reminder);
  const canEditPermission = !reminder || reminder.creatorUserId === currentUser?.id;
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState(reminder?.title ?? '');
  const [description, setDescription] = useState(reminder?.description ?? '');
  const [dateRuleType, setDateRuleType] = useState<AnniversaryDateRuleType>(reminder?.dateRuleType ?? 'fixed_solar');
  const [calendarType, setCalendarType] = useState<CalendarType>(reminder?.calendarType ?? 'solar');
  const [selectedDate, setSelectedDate] = useState(() => dateFromOriginalCalendar(reminder));
  const [ruleMonth, setRuleMonth] = useState(reminder?.ruleMonth ?? new Date().getMonth() + 1);
  const [ruleWeekOfMonth, setRuleWeekOfMonth] = useState(reminder?.ruleWeekOfMonth ?? 2);
  const [ruleWeekday, setRuleWeekday] = useState(reminder?.ruleWeekday ?? 0);
  const [selectedTime, setSelectedTime] = useState<TimeValue>(() => timeFromIso(reminder?.firstRemindAt));
  const [remindType, setRemindType] = useState<AnniversaryRemindType>(reminder?.remindType ?? 'repeat');
  const [periodType, setPeriodType] = useState<AnniversaryPeriodType>(reminder?.periodType ?? 'yearly');
  const [advanceDays, setAdvanceDays] = useState(
    () =>
      reminder?.remindOffsetDays ??
      (reminder?.firstRemindAt && reminder?.targetDate
        ? diffCalendarDays(new Date(reminder.firstRemindAt), new Date(reminder.targetDate))
        : 3),
  );
  const [customDays, setCustomDays] = useState(reminder?.customDays ? String(reminder.customDays) : '7');
  const [repeatTimes, setRepeatTimes] = useState(reminder?.repeatTimes ? String(reminder.repeatTimes) : '3');
  const [permissionType, setPermissionType] = useState<AnniversaryPermissionType>(
    reminder?.permissionType ?? 'partner_visible',
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerSheet, setPickerSheet] = useState<PickerSheet>(null);

  useEffect(() => {
    if (!route.params?.reminderId || !currentUser) {
      return;
    }

    let mounted = true;
    void anniversaryApi.get(route.params.reminderId).then(({ data }) => {
      if (!mounted) {
        return;
      }

      setReminder(data);
      setTitle(data.baseTitle || data.title);
      setDescription(data.description);
      setDateRuleType(data.dateRuleType ?? 'fixed_solar');
      setCalendarType(data.calendarType);
      setSelectedDate(dateFromOriginalCalendar(data));
      setRuleMonth(data.ruleMonth ?? new Date().getMonth() + 1);
      setRuleWeekOfMonth(data.ruleWeekOfMonth ?? 2);
      setRuleWeekday(data.ruleWeekday ?? 0);
      setSelectedTime(timeFromIso(data.firstRemindAt));
      setRemindType(data.remindType);
      setPeriodType(data.periodType ?? 'yearly');
      setAdvanceDays(data.remindOffsetDays);
      setCustomDays(data.customDays ? String(data.customDays) : '7');
      setRepeatTimes(data.repeatTimes ? String(data.repeatTimes) : '3');
      setPermissionType(data.permissionType);
    });

    return () => {
      mounted = false;
    };
  }, [currentUser, route.params?.reminderId]);

  const saveLabel = useMemo(() => (isEditing ? '保存提醒' : '创建提醒'), [isEditing]);
  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.38) : theme.colors.cardBorder;
  const selectedSolarDate = useMemo(() => toSolarDate(selectedDate, calendarType), [calendarType, selectedDate]);
  const triggerDate = useMemo(() => addDays(selectedSolarDate, -advanceDays), [advanceDays, selectedSolarDate]);
  const targetDateTime = useMemo(
    () => combineDateTime(selectedSolarDate, selectedTime),
    [selectedSolarDate, selectedTime],
  );
  const firstRemindAt = useMemo(() => combineDateTime(triggerDate, selectedTime), [selectedTime, triggerDate]);
  const lunarDayCountResolver = useCallback(
    (year: number, month: number) => LunarMonth.fromYm(year, month)?.getDayCount?.() ?? 30,
    [],
  );

  const handleSave = async () => {
    if (!currentUser || !relationship || !title.trim()) {
      dialog.alert('还差一点', '请填写标题后再保存');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        relationship_id: relationship.id,
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDateTime.toISOString(),
        first_remind_at: firstRemindAt.toISOString(),
        date_rule_type: dateRuleType,
        rule_month:
          dateRuleType === 'weekday_of_month'
            ? ruleMonth
            : dateRuleType === 'fixed_solar' || dateRuleType === 'fixed_lunar'
              ? selectedSolarDate.getMonth() + 1
              : null,
        rule_day: dateRuleType === 'fixed_solar' || dateRuleType === 'fixed_lunar' ? selectedSolarDate.getDate() : null,
        rule_week_of_month: dateRuleType === 'weekday_of_month' ? ruleWeekOfMonth : null,
        rule_weekday: dateRuleType === 'weekday_of_month' ? ruleWeekday : null,
        remind_type: remindType,
        period_type: remindType === 'single' ? null : periodType,
        custom_days: periodType === 'custom_days' ? Number(customDays) || null : null,
        repeat_times: remindType === 'multiple' ? Number(repeatTimes) || null : null,
        status: 'active',
        ...(canEditPermission ? { permission_type: permissionType } : {}),
      };

      if (reminder) {
        await anniversaryApi.update(reminder.id, payload);
      } else {
        await anniversaryApi.create(payload);
      }
      void syncLocalNotificationSchedules(useAppStore.getState().notificationSettings);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Anniversaries', { refreshToken: Date.now() });
      }
    } catch {
      dialog.alert('保存失败', '请稍后再试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader
        title={isEditing ? '编辑纪念日提醒' : '新建纪念日提醒'}
        subtitle="把重要时刻认真安排好"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 116 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>基础信息</Text>

          <FieldLabel label="提醒标题" />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="例如：相识三周年"
            placeholderTextColor={theme.colors.textSoft}
            style={[styles.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
          />

          <FieldLabel label="浪漫备注" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="写下这一天想准备的小惊喜、地点或礼物灵感..."
            placeholderTextColor={theme.colors.textSoft}
            style={[styles.textArea, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>提醒时间</Text>

          <PickerRow
            icon={<ScrollText size={18} color={theme.colors.primary} strokeWidth={2.2} />}
            label="日期规则"
            value={formatDateRuleType(dateRuleType)}
            onPress={() => setPickerSheet('dateRuleType')}
          />
          {dateRuleType === 'weekday_of_month' ? (
            <>
              <PickerRow
                icon={<CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />}
                label="规则月份"
                value={`${ruleMonth} 月`}
                onPress={() => setPickerSheet('ruleMonth')}
              />
              <PickerRow
                icon={<CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />}
                label="第几个星期"
                value={`第 ${ruleWeekOfMonth} 个`}
                onPress={() => setPickerSheet('ruleWeekOfMonth')}
              />
              <PickerRow
                icon={<CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />}
                label="星期几"
                value={weekdayOptions.find((option) => option.value === ruleWeekday)?.label ?? '星期日'}
                onPress={() => setPickerSheet('ruleWeekday')}
              />
            </>
          ) : (
            <>
              <PickerRow
                icon={<ScrollText size={18} color={theme.colors.primary} strokeWidth={2.2} />}
                label="日期类型"
                value={formatCalendarType(calendarType)}
                onPress={() => setPickerSheet('calendarType')}
              />
              <PickerRow
                icon={<CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />}
                label="纪念日日期"
                value={`${formatDate(selectedDate)} ${formatCalendarType(calendarType)}`}
                onPress={() => setDatePickerVisible(true)}
              />
            </>
          )}
          <PickerRow
            icon={<Clock3 size={18} color={theme.colors.primary} strokeWidth={2.2} />}
            label="当天提醒时间"
            value={formatTime(selectedTime)}
            onPress={() => setTimePickerVisible(true)}
          />
          <PickerRow
            icon={<BellRing size={18} color={theme.colors.primary} strokeWidth={2.2} />}
            label="提前几天提醒"
            value={formatAdvanceDays(advanceDays)}
            onPress={() => setPickerSheet('advanceDays')}
            last
          />

          <View style={[styles.previewBox, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.previewTitle, { color: theme.colors.text }]}>实际入库时间</Text>
            <Text style={[styles.previewText, { color: theme.colors.textMuted }]}>
              纪念日：{formatDate(targetDateTime)} {formatTime(selectedTime)}
            </Text>
            <Text style={[styles.previewText, { color: theme.colors.textMuted }]}>
              首次提醒：{formatDate(firstRemindAt)} {formatTime(selectedTime)}
            </Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>提醒规则</Text>

          <FieldLabel label="提醒类型" />
          <PillSelector
            items={remindTypeOptions}
            value={remindType}
            onChange={setRemindType}
            layout="wrap"
            activeBorderColor={withAlpha(theme.colors.primarySoft, 0.72)}
            activeTextColor={theme.colors.badgeText}
            inactiveTextColor={theme.colors.text}
            contentContainerStyle={styles.chipRow}
            pillStyle={{ paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 }}
            textStyle={{ fontSize: 12, lineHeight: 16, fontWeight: '500' }}
          />

          {remindType !== 'single' ? (
            <PickerRow
              icon={<Repeat2 size={18} color={theme.colors.primary} strokeWidth={2.2} />}
              label="提醒周期"
              value={formatPeriod(periodType)}
              onPress={() => setPickerSheet('period')}
              last={periodType !== 'custom_days' && remindType !== 'multiple'}
            />
          ) : null}

          {periodType === 'custom_days' && remindType !== 'single' ? (
            <>
              <FieldLabel label="自定义天数" />
              <TextInput
                value={customDays}
                onChangeText={setCustomDays}
                keyboardType="number-pad"
                placeholder="例如：7"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
              />
            </>
          ) : null}

          {remindType === 'multiple' ? (
            <>
              <FieldLabel label="提醒次数" />
              <TextInput
                value={repeatTimes}
                onChangeText={setRepeatTimes}
                keyboardType="number-pad"
                placeholder="例如：3"
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
              />
            </>
          ) : null}
        </View>

        {canEditPermission ? (
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>权限设置</Text>

            <PickerRow
              icon={<Heart size={18} color={theme.colors.primary} strokeWidth={2.2} />}
              label="纪念日权限"
              value={formatPermission(permissionType)}
              onPress={() => setPickerSheet('permission')}
              last
            />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 14,
            backgroundColor: withAlpha(theme.colors.background, 0.96),
          },
        ]}
      >
        <RomanticGradientButton title={isSaving ? '保存中...' : saveLabel} disabled={isSaving} onPress={handleSave} />
      </View>

      <DateBottomSheetPicker
        visible={datePickerVisible}
        value={selectedDate}
        title={calendarType === 'lunar' ? '选择农历日期' : '选择国历日期'}
        dayCountResolver={calendarType === 'lunar' ? lunarDayCountResolver : undefined}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={setSelectedDate}
      />
      <TimeBottomSheetPicker
        visible={timePickerVisible}
        value={selectedTime}
        title="选择当天提醒时间"
        showSecond={false}
        onClose={() => setTimePickerVisible(false)}
        onConfirm={setSelectedTime}
      />
      <SingleSelectBottomSheetPicker
        visible={pickerSheet === 'dateRuleType'}
        title="选择日期规则"
        value={dateRuleType}
        options={dateRuleTypeOptions}
        onClose={() => setPickerSheet(null)}
        onConfirm={(value) => {
          setDateRuleType(value);
          setCalendarType(value === 'fixed_lunar' ? 'lunar' : 'solar');
        }}
      />
      <SingleSelectBottomSheetPicker
        visible={pickerSheet === 'calendarType'}
        title="选择日期类型"
        value={calendarType}
        options={calendarTypeOptions}
        onClose={() => setPickerSheet(null)}
        onConfirm={setCalendarType}
      />
      <SingleSelectBottomSheetPicker
        visible={pickerSheet === 'ruleMonth'}
        title="选择月份"
        value={ruleMonth}
        options={monthOptions}
        onClose={() => setPickerSheet(null)}
        onConfirm={setRuleMonth}
      />
      <SingleSelectBottomSheetPicker
        visible={pickerSheet === 'ruleWeekOfMonth'}
        title="选择第几个星期"
        value={ruleWeekOfMonth}
        options={weekOfMonthOptions}
        onClose={() => setPickerSheet(null)}
        onConfirm={setRuleWeekOfMonth}
      />
      <SingleSelectBottomSheetPicker
        visible={pickerSheet === 'ruleWeekday'}
        title="选择星期几"
        value={ruleWeekday}
        options={weekdayOptions}
        onClose={() => setPickerSheet(null)}
        onConfirm={setRuleWeekday}
      />
      <SingleSelectBottomSheetPicker
        visible={pickerSheet === 'period'}
        title="选择提醒周期"
        value={periodType}
        options={periodOptions}
        onClose={() => setPickerSheet(null)}
        onConfirm={setPeriodType}
      />
      <SingleSelectBottomSheetPicker
        visible={pickerSheet === 'advanceDays'}
        title="选择提前提醒"
        value={advanceDays}
        options={advanceDayOptions}
        onClose={() => setPickerSheet(null)}
        onConfirm={setAdvanceDays}
      />
      <SingleSelectBottomSheetPicker
        visible={pickerSheet === 'permission'}
        title="选择纪念日权限"
        value={permissionType}
        options={permissionOptions}
        onClose={() => setPickerSheet(null)}
        onConfirm={setPermissionType}
      />
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  const theme = useAppTheme();

  return <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text>;
}

function PickerRow({
  icon,
  label,
  value,
  onPress,
  disabled,
  last,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const theme = useAppTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerRow,
        !last ? { borderBottomColor: withAlpha(theme.colors.cardBorder, 0.3), borderBottomWidth: 1 } : null,
        { opacity: disabled ? 0.55 : pressed ? 0.72 : 1 },
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.pickerLeft}>
        <View style={[styles.pickerIconWrap, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.82) }]}>
          {icon}
        </View>
        <Text style={[styles.pickerLabel, { color: theme.colors.text }]}>{label}</Text>
      </View>
      <View style={styles.pickerRight}>
        <Text style={[styles.pickerValue, { color: theme.colors.primary }]}>{value}</Text>
        <ChevronRight size={16} color={theme.colors.textSoft} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  textArea: {
    minHeight: 118,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  pickerRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  pickerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  pickerRight: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickerValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  previewBox: {
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  previewTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  previewText: {
    fontSize: 12,
    lineHeight: 18,
  },
  permissionHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  chipRow: {
    gap: 10,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
