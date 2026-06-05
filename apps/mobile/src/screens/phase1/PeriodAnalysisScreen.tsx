import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, MoonStar, Utensils, CalendarDays, Droplets, TrendingUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { periodApi } from '../../services/periodApi';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodAnalysisDto } from '../../types/period';
import { periodAnalysisEmpty } from '../../utils/periodEmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'PeriodAnalysis'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function trendIcon(kind: PeriodAnalysisDto['symptomTrends'][number]['kind'], color: string) {
  if (kind === 'diet') return <Utensils size={18} color={color} strokeWidth={2.2} />;
  if (kind === 'sleep') return <MoonStar size={18} color={color} strokeWidth={2.2} />;
  return <TrendingUp size={18} color={color} strokeWidth={2.2} />;
}

export function PeriodAnalysisScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [analysis, setAnalysis] = useState<PeriodAnalysisDto>(periodAnalysisEmpty);
  const rangeInsights = [analysis.cycleLengthInsight, analysis.periodDurationInsight];

  useEffect(() => {
    let mounted = true;

    periodApi.getAnalysis().then((response) => {
      if (mounted) {
        setAnalysis(response.data);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="周期分析" subtitle="过去 6 个月的数据洞察" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.chartRow}>
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: withAlpha(theme.colors.cardBorder, 0.72),
                shadowColor: withAlpha(theme.colors.primary, 0.1),
              },
            ]}
          >
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: theme.colors.text }]}>平均周期长度</Text>
                <View style={styles.chartValueRow}>
                  <Text style={[styles.chartValue, { color: theme.colors.primary }]}>
                    {analysis.averageCycleLength}
                  </Text>
                  <Text style={[styles.chartValueUnit, { color: theme.colors.textSoft }]}>天</Text>
                </View>
              </View>
              <CalendarDays size={20} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.metricList}>
              {analysis.cycleLengths.map((item, index) => (
                <View
                  key={`${analysis.monthLabels[index]}-${item}`}
                  style={[
                    styles.metricRowItem,
                    {
                      borderColor: withAlpha(theme.colors.cardBorder, 0.55),
                      backgroundColor:
                        index === analysis.cycleLengths.length - 1
                          ? withAlpha(theme.colors.primarySoft, 0.16)
                          : withAlpha(theme.colors.surfaceAlt, 0.62),
                    },
                  ]}
                >
                  <View style={styles.durationMonthWrap}>
                    <View
                      style={[
                        styles.durationDot,
                        {
                          backgroundColor:
                            index === analysis.cycleLengths.length - 1
                              ? theme.colors.primary
                              : withAlpha(theme.colors.primary, 0.38),
                        },
                      ]}
                    />
                    <Text style={[styles.durationMonth, { color: theme.colors.textMuted }]}>
                      {analysis.monthLabels[index] ?? `${index + 1}月`}
                    </Text>
                  </View>
                  <Text style={[styles.durationValue, { color: theme.colors.text }]}>{item} 天</Text>
                </View>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: withAlpha(theme.colors.cardBorder, 0.72),
                shadowColor: withAlpha(theme.colors.primary, 0.1),
              },
            ]}
          >
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: theme.colors.text }]}>经期持续时间</Text>
                <View style={styles.chartValueRow}>
                  <Text style={[styles.chartValue, { color: theme.colors.primary }]}>
                    {analysis.averagePeriodDuration}
                  </Text>
                  <Text style={[styles.chartValueUnit, { color: theme.colors.textSoft }]}>天</Text>
                </View>
              </View>
              <Droplets size={20} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.durationList}>
              {analysis.durationLengths.map((item, index) => (
                <View
                  key={`${analysis.monthLabels[index]}-${item}`}
                  style={[
                    styles.durationRow,
                    {
                      borderColor: withAlpha(theme.colors.cardBorder, 0.55),
                      backgroundColor:
                        index === analysis.durationLengths.length - 1
                          ? withAlpha(theme.colors.primarySoft, 0.16)
                          : withAlpha(theme.colors.surfaceAlt, 0.62),
                    },
                  ]}
                >
                  <View style={styles.durationMonthWrap}>
                    <View
                      style={[
                        styles.durationDot,
                        {
                          backgroundColor:
                            index === analysis.durationLengths.length - 1
                              ? theme.colors.primary
                              : withAlpha(theme.colors.primary, 0.38),
                        },
                      ]}
                    />
                    <Text style={[styles.durationMonth, { color: theme.colors.textMuted }]}>
                      {analysis.monthLabels[index] ?? `${index + 1}月`}
                    </Text>
                  </View>
                  <Text style={[styles.durationValue, { color: theme.colors.text }]}>{item} 天</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.infoPanel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>规律性分析</Text>
          {rangeInsights.map((insight) => (
            <View key={insight.title} style={styles.compareBlock}>
              <View style={styles.compareHeader}>
                <Text
                  style={[styles.compareLabel, { color: theme.colors.textMuted }]}
                >{`${insight.title} (${insight.value}${insight.unit})`}</Text>
                <Text style={[styles.compareState, { color: theme.colors.primary }]}>{insight.label}</Text>
              </View>
              <View style={[styles.compareTrack, { backgroundColor: withAlpha(theme.colors.textSoft, 0.16) }]}>
                <View
                  style={[
                    styles.compareRange,
                    {
                      backgroundColor: withAlpha(theme.colors.secondarySoft, 0.5),
                      left: `${insight.normalRangeStartPercent}%`,
                      right: `${100 - insight.normalRangeEndPercent}%`,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.compareFill,
                    { width: `${insight.progressPercent}%`, backgroundColor: theme.colors.primarySoft },
                  ]}
                />
                <View style={[styles.compareMarker, { left: `${insight.progressPercent}%` }]} />
              </View>
              <View style={styles.compareScale}>
                <Text style={[styles.compareScaleText, { color: theme.colors.textSoft }]}>{insight.lowerLabel}</Text>
                <Text style={[styles.compareScaleText, { color: theme.colors.textSoft }]}>
                  {insight.normalRangeLabel}
                </Text>
                <Text style={[styles.compareScaleText, { color: theme.colors.textSoft }]}>{insight.upperLabel}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.symptomSection}>
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>症状趋势</Text>
          {analysis.aiAvailable && analysis.aiSummary ? (
            <Text style={[styles.aiSummary, { color: theme.colors.textMuted }]}>{analysis.aiSummary}</Text>
          ) : null}
          {analysis.symptomTrends.map((item) => (
            <View
              key={`${item.kind}-${item.title}`}
              style={[
                styles.trendCard,
                { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
              ]}
            >
              <View style={[styles.trendIconWrap, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.7) }]}>
                {trendIcon(item.kind, theme.colors.primary)}
              </View>
              <View style={styles.trendCopy}>
                <Text style={[styles.trendTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>{item.description}</Text>
              </View>
              <View style={[styles.countPill, { backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.countText, { color: theme.colors.primary }]}>
                  {item.count > 0 ? `${item.count}次` : '待记录'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.advicePanel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.primarySoft, 0.6) },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.primary }]}>健康小贴士</Text>
          {analysis.healthTips.map((item) => (
            <View key={item} style={styles.tipItem}>
              <CheckCircle2 size={16} color={theme.colors.primary} strokeWidth={2.2} />
              <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  heading: { marginBottom: 18, marginTop: 8 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  chartRow: { gap: 14 },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    minHeight: 256,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  chartTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  chartValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  chartValue: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  chartValueUnit: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  metricList: { marginTop: 'auto', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(82,67,70,0.12)', gap: 10 },
  metricRowItem: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationList: { marginTop: 'auto', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(82,67,70,0.12)', gap: 10 },
  durationRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationMonthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  durationDot: { width: 8, height: 8, borderRadius: 999 },
  durationMonth: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  durationValue: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  infoPanel: { marginTop: 14, borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  panelTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  compareBlock: { gap: 8 },
  compareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compareLabel: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  compareState: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  compareTrack: { height: 12, borderRadius: 999, overflow: 'hidden', position: 'relative' },
  compareRange: { position: 'absolute', top: 0, bottom: 0 },
  compareFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999 },
  compareMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    marginLeft: -2,
  },
  compareScale: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  compareScaleText: { fontSize: 10, lineHeight: 12 },
  symptomSection: { marginTop: 16, gap: 16 },
  aiSummary: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  trendCard: { borderRadius: 16, borderWidth: 1, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  trendIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  trendCopy: { flex: 1 },
  trendTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600', marginBottom: 4 },
  countPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  countText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  tipItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  advicePanel: { marginTop: 16, borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
});
