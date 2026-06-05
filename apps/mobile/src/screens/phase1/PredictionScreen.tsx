import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { periodApi } from '../../services/periodApi';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodPredictionDto } from '../../types/period';
import { periodPredictionEmpty } from '../../utils/periodEmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'Prediction'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function PredictionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [prediction, setPrediction] = useState<PeriodPredictionDto>(periodPredictionEmpty);

  useEffect(() => {
    let mounted = true;

    periodApi.getPrediction().then((response) => {
      if (mounted) {
        setPrediction(response.data);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="预测详情" subtitle="AI 智能预测与健康建议" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <View style={[styles.aiBadge, { backgroundColor: theme.colors.primarySoft }]}>
            <Sparkles size={14} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.aiBadgeText, { color: theme.colors.badgeText }]}>AI 智能预测</Text>
          </View>
          <Text style={[styles.heroLabel, { color: theme.colors.textMuted }]}>预计下次生理期</Text>
          <Text style={[styles.heroDate, { color: theme.colors.text }]}>{prediction.nextPeriodDateLabel}</Text>
          <Text
            style={[styles.heroHint, { color: theme.colors.textMuted }]}
          >{`距离今天还有 ${prediction.daysUntilPeriod} 天`}</Text>
        </View>

        {prediction.aiAvailable && prediction.adjustmentReasonSummary ? (
          <View
            style={[
              styles.aiReasonCard,
              { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.primarySoft, 0.72) },
            ]}
          >
            <View style={[styles.aiReasonIcon, { backgroundColor: theme.colors.primarySoft }]}>
              <Sparkles size={16} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.aiReasonCopy}>
              <Text style={[styles.aiReasonTitle, { color: theme.colors.text }]}>
                {prediction.aiAdjusted ? 'AI 已修正预测' : 'AI 数据分析'}
              </Text>
              <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                {prediction.adjustmentReasonSummary}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.metricRow}>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
            ]}
          >
            <CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.metricLabel, { color: theme.colors.textSoft }]}>排卵期预测</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{prediction.ovulationRangeLabel}</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
            ]}
          >
            <Text style={[styles.metricLabel, { color: theme.colors.textSoft }]}>预测置信度</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{`${prediction.confidencePercent}%`}</Text>
          </View>
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>贴心健康建议</Text>
          {prediction.advice.map((item) => (
            <Text key={item} style={[styles.tipText, { color: theme.colors.textMuted }]}>
              {item}
            </Text>
          ))}
        </View>

        <RomanticGradientButton title="记录今日状态" onPress={() => navigation.navigate('PeriodDailyRecord')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  brand: { fontSize: 26, lineHeight: 30, fontWeight: '700', textAlign: 'center', marginBottom: 18 },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: 22 },
  aiBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBadgeText: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  heroLabel: { marginTop: 18, fontSize: 14, lineHeight: 20 },
  heroDate: { marginTop: 8, fontSize: 36, lineHeight: 40, fontWeight: '700' },
  heroHint: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  aiReasonCard: { marginTop: 16, borderRadius: 20, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12 },
  aiReasonIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  aiReasonCopy: { flex: 1 },
  aiReasonTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600', marginBottom: 4 },
  metricRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  metricCard: { flex: 1, borderRadius: 22, borderWidth: 1, padding: 16 },
  metricLabel: { marginTop: 10, fontSize: 12, lineHeight: 16 },
  metricValue: { marginTop: 6, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  panel: { marginTop: 16, borderRadius: 24, borderWidth: 1, padding: 18, gap: 12, marginBottom: 18 },
  panelTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  tipText: { fontSize: 14, lineHeight: 20 },
});
