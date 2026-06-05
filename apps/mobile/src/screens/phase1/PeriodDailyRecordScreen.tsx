import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Droplets,
  Heart,
  NotebookPen,
  Smile,
  Stethoscope,
  Thermometer,
  Weight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSwitch } from '../../components/AppSwitch';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  periodDailyRecordDraftEmpty,
  periodDailyRecordOptionsEmpty,
  periodHomeOverviewEmpty,
} from '../../utils/periodEmptyState';
import { periodApi } from '../../services/periodApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodDailyRecordDraftDto, PeriodDailyRecordOptionsDto, PeriodHomeOverviewDto } from '../../types/period';

type Props = NativeStackScreenProps<RootStackParamList, 'PeriodDailyRecord'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

type SelectChipGroupProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  theme: ReturnType<typeof useAppTheme>;
  compact?: boolean;
  disabled?: boolean;
};

function SelectChipGroup({ options, value, onChange, theme, compact = false, disabled = false }: SelectChipGroupProps) {
  return (
    <View style={[styles.choiceGrid, compact ? styles.choiceGridCompact : null]}>
      {options.map((item) => {
        const active = value === item;
        return (
          <Pressable
            key={item}
            style={[
              compact ? styles.choiceChipCompact : styles.choiceChip,
              {
                backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceAlt,
                borderColor: active ? theme.colors.primary : withAlpha(theme.colors.cardBorder, 0.3),
              },
            ]}
            onPress={() => onChange(item)}
            disabled={disabled}
          >
            <Text style={[styles.choiceText, { color: active ? theme.colors.badgeText : theme.colors.text }]}>
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type LevelSelectorProps = {
  value: number;
  max: number;
  onChange: (value: number) => void;
  theme: ReturnType<typeof useAppTheme>;
  disabled?: boolean;
};

function LevelSelector({ value, max, onChange, theme, disabled = false }: LevelSelectorProps) {
  return (
    <View style={styles.levelWrap}>
      {Array.from({ length: max + 1 }, (_, item) => {
        const active = item <= value;
        return (
          <Pressable
            key={item}
            style={[
              styles.levelDot,
              {
                backgroundColor: active ? theme.colors.primary : withAlpha(theme.colors.textSoft, 0.18),
              },
            ]}
            onPress={() => onChange(item)}
            disabled={disabled}
          />
        );
      })}
    </View>
  );
}

function normalizeDecimalInput(value: string) {
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const [integerPart, ...decimalParts] = normalized.split('.');
  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart}.${decimalParts.join('')}`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PeriodDailyRecordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentUser } = useAppStore();
  const [overview, setOverview] = useState<PeriodHomeOverviewDto>(periodHomeOverviewEmpty);
  const [record, setRecord] = useState<PeriodDailyRecordDraftDto>(periodDailyRecordDraftEmpty);
  const [options, setOptions] = useState<PeriodDailyRecordOptionsDto>(periodDailyRecordOptionsEmpty);
  const [confirmPeriodSwitch, setConfirmPeriodSwitch] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([periodApi.getHomeOverview(), periodApi.getDailyRecordDraft(), periodApi.getDailyRecordOptions()]).then(
      ([overviewResponse, draftResponse, optionsResponse]) => {
        if (!mounted) {
          return;
        }

        setOverview(overviewResponse.data);
        setRecord(draftResponse.data);
        setOptions(optionsResponse.data);
        setConfirmPeriodSwitch(false);
      },
    );

    return () => {
      mounted = false;
    };
  }, []);

  const toggleSymptom = (symptom: string) => {
    setRecord((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((item) => item !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const canAdjustPeriodCycle = (currentUser?.gender ?? 'female') === 'female';
  const isPeriodRecord = record.isPeriodDay;
  const canEditRecord = true;
  const needsConfirmPeriod =
    canAdjustPeriodCycle && overview.isPredictionReachedButUnconfirmed && !overview.isPeriodConfirmed;
  const recordDateLabel = record.recordDate === toDateKey(new Date()) ? '今天' : record.recordDate;

  const handleConfirmPeriodStart = async () => {
    if (!canAdjustPeriodCycle) {
      return;
    }
    setConfirmPeriodSwitch(true);
    const response = await periodApi.confirmPeriodStarted(record.recordDate);
    setOverview(response.data);
    setConfirmPeriodSwitch(false);
  };

  const handleSaveRecord = async () => {
    await periodApi.saveDailyRecord(record);
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader
        title={isPeriodRecord ? '每日状态记录' : '日常身体记录'}
        subtitle={`当前记录日期：${recordDateLabel}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 132 }]}
        showsVerticalScrollIndicator={false}
      >
        {!canEditRecord ? (
          <View
            style={[styles.noticeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
          >
            <Text style={[styles.noticeTitle, { color: theme.colors.text }]}>
              {needsConfirmPeriod ? '预测时间已到，先确认今天是否来月经' : '当前不在经期，暂时不能记录每日状态'}
            </Text>
            <Text style={[styles.noticeDesc, { color: theme.colors.textMuted }]}>
              {needsConfirmPeriod
                ? `系统判断预测经期已经推迟 ${overview.overdueDays} 天。请先确认今天是否已经来月经，再开始记录当天状态。`
                : `系统预测距离下次经期还有 ${overview.daysUntilPeriod} 天。等你确认经期开始后，这里才会开放记录。`}
            </Text>
            {needsConfirmPeriod ? (
              <View
                style={[
                  styles.noticeSwitchRow,
                  {
                    backgroundColor: withAlpha(theme.colors.primarySoft, 0.16),
                    borderColor: withAlpha(theme.colors.cardBorder, 0.45),
                  },
                ]}
              >
                <View style={styles.noticeSwitchCopy}>
                  <Text style={[styles.noticeSwitchTitle, { color: theme.colors.text }]}>今天来月经了</Text>
                  <Text style={[styles.noticeSwitchDesc, { color: theme.colors.textMuted }]}>
                    打开开关后，才会开放下面的每日状态记录。
                  </Text>
                </View>
                <AppSwitch
                  value={confirmPeriodSwitch}
                  onValueChange={(value) => {
                    if (value) {
                      void handleConfirmPeriodStart();
                    }
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.primarySection,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
              shadowColor: withAlpha(theme.colors.primary, 0.08),
              opacity: canEditRecord ? 1 : 0.45,
            },
          ]}
        >
          <View style={[styles.decorBlur, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.18) }]} />

          <View style={styles.fieldGroup}>
            <View style={styles.fieldTitleRow}>
              <Smile size={18} color={theme.colors.primary} strokeWidth={2.2} />
              <Text style={[styles.fieldTitle, { color: theme.colors.text }]}>情绪</Text>
            </View>
            <View style={styles.moodRow}>
              {[
                { emoji: '😊', label: '开心' },
                { emoji: '😌', label: '平静' },
                { emoji: '😢', label: '低落' },
                { emoji: '😤', label: '烦躁' },
              ].map((item) => {
                const active = record.mood === item.label;
                return (
                  <Pressable
                    key={item.label}
                    style={[
                      styles.moodCard,
                      {
                        backgroundColor: active ? theme.colors.secondarySoft : theme.colors.surfaceAlt,
                        borderColor: active ? theme.colors.primary : withAlpha(theme.colors.cardBorder, 0.25),
                        shadowColor: active ? withAlpha(theme.colors.primary, 0.16) : 'transparent',
                      },
                    ]}
                    onPress={() => setRecord((prev) => ({ ...prev, mood: item.label }))}
                    disabled={!canEditRecord}
                  >
                    <Text style={styles.moodEmoji}>{item.emoji}</Text>
                    <Text
                      style={[styles.moodLabel, { color: active ? theme.colors.badgeText : theme.colors.textSoft }]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {isPeriodRecord ? (
            <View style={styles.fieldGroup}>
              <View style={styles.fieldTitleRow}>
                <Droplets size={18} color={theme.colors.primary} strokeWidth={2.2} />
                <Text style={[styles.fieldTitle, { color: theme.colors.text }]}>流量</Text>
              </View>
              <SelectChipGroup
                options={options.flowOptions}
                value={record.flow}
                onChange={(value) => setRecord((prev) => ({ ...prev, flow: value }))}
                theme={theme}
                compact
                disabled={!canEditRecord}
              />
            </View>
          ) : null}

          {isPeriodRecord ? (
            <View style={styles.fieldGroup}>
              <View style={styles.fieldTitleRow}>
                <Stethoscope size={18} color={theme.colors.primary} strokeWidth={2.2} />
                <Text style={[styles.fieldTitle, { color: theme.colors.text }]}>痛感</Text>
              </View>
              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderEndLabel, { color: theme.colors.textSoft }]}>无</Text>
                <Text style={[styles.sliderEndLabel, { color: theme.colors.textSoft }]}>严重</Text>
              </View>
              <LevelSelector
                value={record.painLevel}
                max={3}
                onChange={(value) => setRecord((prev) => ({ ...prev, painLevel: value }))}
                theme={theme}
                disabled={!canEditRecord}
              />
              <View style={styles.sliderScale}>
                {[0, 1, 2, 3].map((item) => (
                  <Text key={item} style={[styles.sliderScaleText, { color: theme.colors.textSoft }]}>
                    {item}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
              opacity: canEditRecord ? 1 : 0.45,
            },
          ]}
        >
          <Text style={[styles.fieldTitle, { color: theme.colors.text }]}>身体状态</Text>
          <View style={styles.fieldStack}>
            {isPeriodRecord ? (
              <>
                <View>
                  <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>经血颜色</Text>
                  <SelectChipGroup
                    options={options.bloodColorOptions}
                    value={record.bloodColor}
                    onChange={(value) => setRecord((prev) => ({ ...prev, bloodColor: value }))}
                    theme={theme}
                    compact
                    disabled={!canEditRecord}
                  />
                </View>
                <View style={styles.inlineSwitchRow}>
                  <Text style={[styles.subLabel, { color: theme.colors.text }]}>经血中有血块</Text>
                  <AppSwitch
                    value={record.bloodClot}
                    onValueChange={(value) => setRecord((prev) => ({ ...prev, bloodClot: value }))}
                    disabled={!canEditRecord}
                  />
                </View>
              </>
            ) : null}
            <View>
              <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>白带 / 分泌物变化</Text>
              <SelectChipGroup
                options={options.dischargeOptions}
                value={record.dischargeType}
                onChange={(value) => setRecord((prev) => ({ ...prev, dischargeType: value }))}
                theme={theme}
                compact
                disabled={!canEditRecord}
              />
            </View>
            {isPeriodRecord ? (
              <View>
                <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>腹痛部位</Text>
                <SelectChipGroup
                  options={options.abdomenAreas}
                  value={record.abdomenPainArea}
                  onChange={(value) => setRecord((prev) => ({ ...prev, abdomenPainArea: value }))}
                  theme={theme}
                  compact
                  disabled={!canEditRecord}
                />
              </View>
            ) : null}
          </View>
        </View>

        {isPeriodRecord ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.cardBorder,
                opacity: canEditRecord ? 1 : 0.45,
              },
            ]}
          >
            <Text style={[styles.fieldTitle, { color: theme.colors.text }]}>症状</Text>
            <View style={styles.symptomGrid}>
              {options.symptomOptions.map((item) => {
                const active = record.symptoms.includes(item);
                return (
                  <View
                    key={item}
                    style={[
                      styles.symptomItem,
                      { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.2) },
                    ]}
                  >
                    <Text style={[styles.symptomText, { color: theme.colors.text }]}>{item}</Text>
                    <AppSwitch value={active} onValueChange={() => toggleSymptom(item)} disabled={!canEditRecord} />
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={[styles.dualCardRow, { opacity: canEditRecord ? 1 : 0.45 }]}>
          <View
            style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
          >
            <View style={styles.fieldTitleRow}>
              <Weight size={16} color={theme.colors.primary} strokeWidth={2.2} />
              <Text style={[styles.fieldTitleSmall, { color: theme.colors.text }]}>体重 (kg)</Text>
            </View>
            <TextInput
              value={record.weightKg}
              onChangeText={(value) => setRecord((prev) => ({ ...prev, weightKg: normalizeDecimalInput(value) }))}
              keyboardType="numbers-and-punctuation"
              style={[styles.metricInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
              editable={canEditRecord}
            />
          </View>
          <View
            style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
          >
            <View style={styles.fieldTitleRow}>
              <Thermometer size={16} color={theme.colors.primary} strokeWidth={2.2} />
              <Text style={[styles.fieldTitleSmall, { color: theme.colors.text }]}>体温 (°C)</Text>
            </View>
            <TextInput
              value={record.temperature}
              onChangeText={(value) => setRecord((prev) => ({ ...prev, temperature: normalizeDecimalInput(value) }))}
              keyboardType="numbers-and-punctuation"
              style={[styles.metricInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
              editable={canEditRecord}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
              opacity: canEditRecord ? 1 : 0.45,
            },
          ]}
        >
          <Text style={[styles.fieldTitle, { color: theme.colors.text }]}>生活状态</Text>
          <View style={styles.fieldStack}>
            {isPeriodRecord ? (
              <>
                <View>
                  <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>
                    腰酸情况 ({record.backPainLevel})
                  </Text>
                  <LevelSelector
                    value={record.backPainLevel}
                    max={10}
                    onChange={(value) => setRecord((prev) => ({ ...prev, backPainLevel: value }))}
                    theme={theme}
                    disabled={!canEditRecord}
                  />
                </View>
                <View>
                  <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>
                    胸部胀痛 ({record.breastTendernessLevel})
                  </Text>
                  <LevelSelector
                    value={record.breastTendernessLevel}
                    max={10}
                    onChange={(value) => setRecord((prev) => ({ ...prev, breastTendernessLevel: value }))}
                    theme={theme}
                    disabled={!canEditRecord}
                  />
                </View>
              </>
            ) : null}
            <View>
              <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>皮肤状态</Text>
              <SelectChipGroup
                options={options.skinOptions}
                value={record.skinStatus}
                onChange={(value) => setRecord((prev) => ({ ...prev, skinStatus: value }))}
                theme={theme}
                compact
                disabled={!canEditRecord}
              />
            </View>
            <View>
              <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>睡眠状态</Text>
              <SelectChipGroup
                options={options.sleepOptions}
                value={record.sleepQuality}
                onChange={(value) => setRecord((prev) => ({ ...prev, sleepQuality: value }))}
                theme={theme}
                compact
                disabled={!canEditRecord}
              />
            </View>
            <View>
              <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>压力情况 ({record.stressLevel})</Text>
              <LevelSelector
                value={record.stressLevel}
                max={10}
                onChange={(value) => setRecord((prev) => ({ ...prev, stressLevel: value }))}
                theme={theme}
                disabled={!canEditRecord}
              />
            </View>
            <View>
              <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>饮食情况</Text>
              <SelectChipGroup
                options={options.dietOptions}
                value={record.dietStatus}
                onChange={(value) => setRecord((prev) => ({ ...prev, dietStatus: value }))}
                theme={theme}
                compact
                disabled={!canEditRecord}
              />
            </View>
            <View>
              <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>运动情况</Text>
              <SelectChipGroup
                options={options.exerciseOptions}
                value={record.exerciseLevel}
                onChange={(value) => setRecord((prev) => ({ ...prev, exerciseLevel: value }))}
                theme={theme}
                compact
                disabled={!canEditRecord}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
              opacity: canEditRecord ? 1 : 0.45,
            },
          ]}
        >
          <View style={styles.fieldTitleRow}>
            <NotebookPen size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.fieldTitle, { color: theme.colors.text }]}>异常事件 / 备注</Text>
          </View>
          <TextInput
            multiline
            value={record.abnormalEvent}
            onChangeText={(value) => setRecord((prev) => ({ ...prev, abnormalEvent: value }))}
            placeholder="记录异常事件，比如提前出血、剧烈疼痛等"
            placeholderTextColor={theme.colors.textSoft}
            style={[styles.textArea, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
            editable={canEditRecord}
          />
          <TextInput
            multiline
            value={record.note}
            onChangeText={(value) => setRecord((prev) => ({ ...prev, note: value }))}
            placeholder="今天感觉怎么样？"
            placeholderTextColor={theme.colors.textSoft}
            style={[styles.textArea, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
            editable={canEditRecord}
          />
        </View>

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
        {canEditRecord ? (
          <RomanticGradientButton
            title={isPeriodRecord ? '保存记录' : '保存日常记录'}
            onPress={handleSaveRecord}
            icon={<Heart size={18} color="#ffffff" fill="#ffffff" strokeWidth={2.1} />}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  primarySection: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
    overflow: 'hidden',
  },
  decorBlur: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  fieldGroup: { marginBottom: 22 },
  fieldTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  fieldTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  fieldTitleSmall: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  moodRow: { flexDirection: 'row', gap: 12 },
  moodCard: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  moodEmoji: { fontSize: 20, lineHeight: 22 },
  moodLabel: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderEndLabel: { fontSize: 12, lineHeight: 16 },
  levelWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 4, marginBottom: 4 },
  levelDot: { flex: 1, height: 10, borderRadius: 999 },
  sliderScale: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  sliderScaleText: { fontSize: 11, lineHeight: 14 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 3,
  },
  fieldStack: { gap: 16 },
  subLabel: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choiceGridCompact: { gap: 8 },
  choiceChip: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  choiceChipCompact: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  choiceText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  inlineSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  symptomGrid: { gap: 10 },
  symptomItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  symptomText: { fontSize: 14, lineHeight: 20 },
  dualCardRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 3,
  },
  metricInput: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  noticeCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  noticeDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
  },
  noticeSwitchRow: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  noticeSwitchCopy: {
    flex: 1,
  },
  noticeSwitchTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  noticeSwitchDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
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
