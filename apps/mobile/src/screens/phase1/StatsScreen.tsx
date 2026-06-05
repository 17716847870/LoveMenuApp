import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Camera, Heart, MoreHorizontal, UtensilsCrossed } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppTheme } from '../../theme/useAppTheme';
import { SweetFootprintStatsResponse } from '../../types/phaseOne';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatMomentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hour}:${minute}`;
}

const emptyStats: SweetFootprintStatsResponse = {
  together_days: null,
  published_menu_count: 0,
  completed_order_count: 0,
  sweet_index: 0,
  top_menus: [],
  weekly_sweetness: [0, 0, 0, 0, 0, 0, 0],
  latest_moment: null,
};

export function StatsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [stats, setStats] = useState<SweetFootprintStatsResponse>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const maxWeeklyValue = Math.max(...stats.weekly_sweetness, 1);
  const latestMomentText = stats.latest_moment?.content_text?.trim();
  const latestMomentTime = stats.latest_moment
    ? formatMomentTime(stats.latest_moment.record_date ?? stats.latest_moment.posted_at)
    : '';

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      setLoading(true);
      setErrorMessage(null);
      phaseOneApi
        .getSweetFootprintStats()
        .then((response) => {
          if (mounted) {
            setStats(response.data);
          }
        })
        .catch((error: unknown) => {
          if (mounted) {
            setErrorMessage(error instanceof Error ? error.message : '加载失败');
          }
        })
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });

      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="甜蜜足迹" subtitle="记录我们共同的美味时光" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>正在同步甜蜜足迹...</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: withAlpha(theme.colors.primarySoft, 0.22), borderColor: theme.colors.cardBorder },
            ]}
          >
            <Text style={[styles.errorText, { color: theme.colors.textMuted }]}>{errorMessage}</Text>
          </View>
        ) : null}
        <View style={styles.metricGrid}>
          {[
            { label: '在一起的天数', value: stats.together_days ? `${stats.together_days}天` : '未设置', icon: Heart },
            { label: '专属菜单数', value: `${stats.published_menu_count}`, icon: UtensilsCrossed },
            { label: '已完成点单', value: `${stats.completed_order_count}`, icon: Heart },
            { label: '本周甜蜜指数', value: `${stats.sweet_index}%`, icon: Heart },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <View
                key={item.label}
                style={[
                  styles.metricCard,
                  { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
                ]}
              >
                <Icon size={18} color={theme.colors.primary} strokeWidth={2.2} />
                <Text style={[styles.metricLabel, { color: theme.colors.textSoft }]}>{item.label}</Text>
                <Text style={[styles.metricValue, { color: theme.colors.text }]}>{item.value}</Text>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme.colors.text }]}>最爱菜单 Top 3</Text>
            <MoreHorizontal size={18} color={theme.colors.textSoft} strokeWidth={2.2} />
          </View>
          {stats.top_menus.length > 0 ? (
            stats.top_menus.map((item, index) => (
              <View key={item.id} style={styles.rankRow}>
                <Text style={[styles.rankIndex, { color: theme.colors.primary }]}>{index + 1}</Text>
                <View style={styles.rankCopy}>
                  <Text style={[styles.rankTitle, { color: theme.colors.text }]}>{item.title}</Text>
                  <Text style={[styles.rankHint, { color: theme.colors.textMuted }]} numberOfLines={2}>
                    {item.note}
                  </Text>
                </View>
                <Text style={[styles.rankCount, { color: theme.colors.textSoft }]}>{item.count}次</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              还没有完成点单，之后这里会出现你们最爱的菜单。
            </Text>
          )}
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>最近一周心动频率</Text>
          <View style={styles.heartChart}>
            {stats.weekly_sweetness.slice(0, 7).map((item, index) => (
              <View key={`${item}-${index}`} style={styles.heartBarItem}>
                <View
                  style={[
                    styles.heartBar,
                    {
                      height: item === 0 ? 8 : Math.max(18, Math.round((item / maxWeeklyValue) * 88)),
                      backgroundColor: item === 0 ? withAlpha(theme.colors.cardBorder, 0.6) : theme.colors.primarySoft,
                    },
                  ]}
                />
                <Text style={[styles.heartBarLabel, { color: theme.colors.textSoft }]}>
                  {['一', '二', '三', '四', '五', '六', '日'][index]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme.colors.text }]}>最新甜蜜定格</Text>
            <Camera size={18} color={theme.colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.momentText, { color: theme.colors.textMuted }]}>
            {latestMomentText
              ? `${latestMomentTime} ${latestMomentText}`
              : '还没有发布甜蜜定格，去情侣空间记录第一条动态吧。'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  brand: { fontSize: 26, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  title: { marginTop: 18, fontSize: 28, lineHeight: 36, fontWeight: '600' },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  metricCard: { width: '47%', borderRadius: 22, borderWidth: 1, padding: 16 },
  metricLabel: { marginTop: 10, fontSize: 12, lineHeight: 16 },
  metricValue: { marginTop: 6, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  panel: { marginTop: 16, borderRadius: 24, borderWidth: 1, padding: 18 },
  loadingCard: { marginTop: 18, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  errorCard: { marginTop: 18, borderRadius: 18, borderWidth: 1, padding: 14 },
  errorText: { fontSize: 13, lineHeight: 18 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  panelTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  rankIndex: { width: 18, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  rankCopy: { flex: 1 },
  rankTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  rankHint: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  rankCount: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  emptyText: { fontSize: 14, lineHeight: 22 },
  heartChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 94 },
  heartBarItem: { alignItems: 'center', gap: 8, width: 34 },
  heartBar: { width: 22, borderRadius: 999 },
  heartBarLabel: { fontSize: 10, lineHeight: 12 },
  momentText: { fontSize: 14, lineHeight: 22 },
});
