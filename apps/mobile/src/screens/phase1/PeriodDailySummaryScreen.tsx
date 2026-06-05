import { ReactNode, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CalendarDays,
  Droplets,
  Heart,
  NotebookPen,
  Smile,
  Weight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InfoRow } from '../../components/InfoRow';
import { SectionCard } from '../../components/SectionCard';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { periodApi } from '../../services/periodApi';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodDailyRecordDraftDto, PeriodHomeOverviewDto } from '../../types/period';
import { periodDailyRecordDraftEmpty, periodHomeOverviewEmpty } from '../../utils/periodEmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'PeriodDailySummary'>;

export function PeriodDailySummaryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [record, setRecord] = useState<PeriodDailyRecordDraftDto>(periodDailyRecordDraftEmpty);
  const [overview, setOverview] = useState<PeriodHomeOverviewDto>(periodHomeOverviewEmpty);

  useEffect(() => {
    let mounted = true;

    Promise.all([periodApi.getDailyRecordDraft(), periodApi.getHomeOverview()]).then(([recordResponse, overviewResponse]) => {
      if (mounted) {
        setRecord(recordResponse.data);
        setOverview(overviewResponse.data);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const isPeriodRecord = overview.currentCycleRecordedDates.includes(record.recordDate);
  const sections = buildDetailSections(record, isPeriodRecord);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader
        title="记录详情"
        subtitle={`当前查看：${record.recordDate}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {sections.length > 0 ? (
          sections.map((section) => (
            <SectionCard key={section.title} title={section.title} icon={section.icon(theme.colors.primary)}>
              {section.rows.map((row) => (
                <InfoRow key={row.label} label={row.label} value={row.value} />
              ))}
            </SectionCard>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>这一天还没有记录</Text>
            <Text style={[styles.emptyDesc, { color: theme.colors.textMuted }]}>
              保存过的分泌物、情绪、睡眠、体重、备注等内容会在这里展示。
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 14,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <RomanticGradientButton
          title="去编辑这一天的记录"
          onPress={() => navigation.navigate('PeriodDailyRecord')}
          icon={<CalendarDays size={18} color="#ffffff" strokeWidth={2.2} />}
        />
      </View>
    </View>
  );
}

type DetailSection = {
  title: string;
  icon: (color: string) => ReactNode;
  rows: Array<{ label: string; value: string | number }>;
};

function buildDetailSections(record: PeriodDailyRecordDraftDto, isPeriodRecord: boolean): DetailSection[] {
  if (!record.hasRecord) {
    return [];
  }

  const sections: DetailSection[] = [];
  const baseRows: DetailSection['rows'] = [];

  if (isPeriodRecord || record.mood !== '平静') baseRows.push({ label: '情绪', value: record.mood });
  if (isPeriodRecord) {
    baseRows.push({ label: '流量', value: record.flow }, { label: '痛感等级', value: `${record.painLevel}/3` });
  }
  if (baseRows.length > 0) {
    sections.push({
      title: '基础状态',
      icon: (color) => <Smile size={18} color={color} strokeWidth={2.2} />,
      rows: baseRows,
    });
  }

  const bodyRows: DetailSection['rows'] = [];
  if (isPeriodRecord) {
    bodyRows.push(
      { label: '经血颜色', value: record.bloodColor },
      { label: '经血血块', value: record.bloodClot ? '有' : '无' },
    );
  }
  if (record.dischargeType !== '无明显变化') bodyRows.push({ label: '白带变化', value: record.dischargeType });
  if (isPeriodRecord) {
    if (record.abdomenPainArea && record.abdomenPainArea !== '无腹痛') {
      bodyRows.push({ label: '腹痛部位', value: record.abdomenPainArea });
    }
    bodyRows.push(
      { label: '腰酸等级', value: record.backPainLevel },
      { label: '胸部胀痛', value: record.breastTendernessLevel },
    );
  }
  if (bodyRows.length > 0) {
    sections.push({
      title: '身体状态',
      icon: (color) => <Droplets size={18} color={color} strokeWidth={2.2} />,
      rows: bodyRows,
    });
  }

  const lifeRows: DetailSection['rows'] = [];
  if (record.skinStatus !== '稳定') lifeRows.push({ label: '皮肤状态', value: record.skinStatus });
  if (record.sleepQuality !== '一般') lifeRows.push({ label: '睡眠质量', value: record.sleepQuality });
  if (record.stressLevel > 0) lifeRows.push({ label: '压力情况', value: `${record.stressLevel}/10` });
  if (record.dietStatus !== '正常') lifeRows.push({ label: '饮食情况', value: record.dietStatus });
  if (record.exerciseLevel !== '低') lifeRows.push({ label: '运动情况', value: record.exerciseLevel });
  if (isPeriodRecord && record.symptoms.length > 0) lifeRows.push({ label: '症状记录', value: record.symptoms.join('、') });
  if (lifeRows.length > 0) {
    sections.push({
      title: '生活与数据',
      icon: (color) => <Heart size={18} color={color} fill={color} strokeWidth={2.2} />,
      rows: lifeRows,
    });
  }

  const metricRows: DetailSection['rows'] = [];
  if (record.weightKg) metricRows.push({ label: '体重', value: `${record.weightKg} kg` });
  if (record.temperature) metricRows.push({ label: '体温', value: `${record.temperature} °C` });
  if (metricRows.length > 0) {
    sections.push({
      title: '身体指标',
      icon: (color) => <Weight size={18} color={color} strokeWidth={2.2} />,
      rows: metricRows,
    });
  }

  const noteRows: DetailSection['rows'] = [];
  if (record.abnormalEvent) noteRows.push({ label: '异常事件', value: record.abnormalEvent });
  if (record.note) noteRows.push({ label: '今日备注', value: record.note });
  if (noteRows.length > 0) {
    sections.push({
      title: '备注',
      icon: (color) => <NotebookPen size={18} color={color} strokeWidth={2.2} />,
      rows: noteRows,
    });
  }

  return sections;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  emptyDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
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
