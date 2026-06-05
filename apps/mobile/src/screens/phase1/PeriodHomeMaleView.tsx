import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Gift, Heart, Lock, ShieldCheck, TrendingUp, Waves } from 'lucide-react-native';

import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodHomeOverviewDto } from '../../types/period';

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

type Props = {
  overview: PeriodHomeOverviewDto;
  partnerNickname: string;
  partnerAvatarUrl?: string;
  onPressAuthorization?: () => void;
  onPressPeriodAnalysis: () => void;
};

function getPhaseSummary(overview: PeriodHomeOverviewDto) {
  if (overview.currentPhaseKey === 'period') {
    return `现在是经期第 ${overview.cycleDay} 天，预计还有 ${Math.max(overview.periodDuration - overview.cycleDay, 0)} 天结束。`;
  }
  return `距离下一次经期预计还有 ${overview.daysUntilPeriod} 天，下一次经期大约会在 ${overview.nextPeriodDateLabel}。`;
}

function getCareTips(overview: PeriodHomeOverviewDto) {
  switch (overview.currentPhaseKey) {
    case 'period':
      return ['可以提醒她多喝温水，今天尽量少吃生冷。', '如果她今天有点累，适合安排更轻松一点的节奏。'];
    case 'ovulation':
      return ['排卵期情绪和精力通常更活跃，适合轻松约会。', '今天可以多一些陪伴感，顺手准备她喜欢的小零食。'];
    case 'follicular':
      return ['卵泡期状态通常在回升，可以约她散步或做轻运动。', '提醒她继续保持补水和规律作息，会更舒服一些。'];
    default:
      return ['黄体期更适合稳定情绪和放慢节奏，少一点打扰会更贴心。', '今天可以多问一句她想吃什么，照顾感会很明显。'];
  }
}

export function PeriodHomeMaleView({
  overview,
  partnerNickname,
  partnerAvatarUrl,
  onPressAuthorization,
  onPressPeriodAnalysis,
}: Props) {
  const theme = useAppTheme();
  const canEdit = overview.maleEditEnabled;

  if (!overview.maleAccessGranted || !overview.maleViewEnabled) {
    return (
      <>
        <View style={styles.lockHero}>
          <View style={[styles.lockIconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.18) }]}>
            <Lock size={20} color={theme.colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.lockTitle, { color: theme.colors.text }]}>经期信息暂不可见</Text>
          <Text style={[styles.lockSubtitle, { color: theme.colors.textMuted }]}>
            她授权后，这里才会展示共享给你的周期内容。
          </Text>
        </View>

        <View style={styles.lockBadgeRow}>
          {['当前阶段', '预测时间', '记录摘要'].map((item) => (
            <View key={item} style={[styles.lockBadge, { backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.9) }]}>
              <Text style={[styles.lockBadgeText, { color: theme.colors.textSoft }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[
            styles.lockAction,
            {
              backgroundColor: withAlpha(theme.colors.primarySoft, 0.18),
              borderColor: withAlpha(theme.colors.cardBorder, 0.72),
            },
          ]}
          onPress={onPressAuthorization}
        >
          <View style={styles.inlineActionRow}>
            <Lock size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.inlineActionTitle, { color: theme.colors.text }]}>等待授权</Text>
          </View>
        </Pressable>
      </>
    );
  }

  const careTips = getCareTips(overview);

  return (
    <>
      <View
        style={[
          styles.heroCard,
          { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
        ]}
      >
        <View style={[styles.avatarWrap, { borderColor: theme.colors.surface }]}>
          {partnerAvatarUrl ? <Image source={{ uri: partnerAvatarUrl }} style={styles.avatar} /> : null}
        </View>
        <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
          {partnerNickname} 处于{overview.currentPhaseLabel}
        </Text>
        <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{getPhaseSummary(overview)}</Text>
        <View
          style={[
            styles.accessBadge,
            {
              backgroundColor: canEdit
                ? withAlpha(theme.colors.secondarySoft, 0.48)
                : withAlpha(theme.colors.primarySoft, 0.18),
            },
          ]}
        >
          <Text style={[styles.accessBadgeText, { color: canEdit ? theme.colors.secondary : theme.colors.primary }]}>
            {canEdit ? '已授权代记' : '已授权查看'}
          </Text>
        </View>
        <View style={styles.infoGrid}>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
            ]}
          >
            <Heart size={18} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.metricLabel, { color: theme.colors.textSoft }]}>她的心情</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{overview.mood}</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
            ]}
          >
            <CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.metricLabel, { color: theme.colors.textSoft }]}>
              {overview.currentPhaseKey === 'period' ? '预计结束经期' : '下一次经期'}
            </Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {overview.currentPhaseKey === 'period'
                ? `还有 ${Math.max(overview.periodDuration - overview.cycleDay, 0)} 天`
                : `${overview.daysUntilPeriod} 天`}
            </Text>
          </View>
        </View>
      </View>

      {canEdit ? (
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>协同记录</Text>
          <View style={styles.tipRow}>
            <ShieldCheck size={18} color={theme.colors.secondary} strokeWidth={2.2} />
            <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
              你已经可以帮她代记经期开始和结束时间。
            </Text>
          </View>
          <View style={styles.tipRow}>
            <CalendarDays size={18} color={theme.colors.secondary} strokeWidth={2.2} />
            <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
              适合在她不方便操作时，补充这次经期的重要节点。
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>关爱建议</Text>
          <View style={styles.tipRow}>
            <Waves size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>{careTips[0]}</Text>
          </View>
          <View style={styles.tipRow}>
            <Gift size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>{careTips[1]}</Text>
          </View>
        </View>
      )}

      <Pressable
        style={[
          styles.analysisAction,
          { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
        ]}
        onPress={onPressPeriodAnalysis}
      >
        <View style={[styles.analysisIconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.5) }]}>
          <TrendingUp size={18} color={theme.colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.analysisCopy}>
          <Text style={[styles.analysisTitle, { color: theme.colors.text }]}>周期分析</Text>
          <Text style={[styles.analysisMeta, { color: theme.colors.textSoft }]}>
            {overview.cycleLength} 天周期 · 经期 {overview.periodDuration} 天
          </Text>
        </View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: 26, borderWidth: 1, padding: 22, alignItems: 'center' },
  avatarWrap: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', borderWidth: 3 },
  avatar: { width: '100%', height: '100%' },
  lockHero: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  lockIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    marginTop: 16,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  heroTitle: { marginTop: 16, fontSize: 24, lineHeight: 30, fontWeight: '600', textAlign: 'center' },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  accessBadge: {
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  accessBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  lockBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18, justifyContent: 'center' },
  lockBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  lockBadgeText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  lockAction: {
    marginTop: 24,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  infoGrid: { flexDirection: 'row', gap: 12, marginTop: 18 },
  metricCard: { flex: 1, borderRadius: 22, borderWidth: 1, padding: 16 },
  metricLabel: { marginTop: 12, fontSize: 12, lineHeight: 16 },
  metricValue: { marginTop: 6, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  panel: { marginTop: 16, borderRadius: 24, borderWidth: 1, padding: 18, gap: 14 },
  panelTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  tipRow: { flexDirection: 'row', gap: 10 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  analysisAction: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  analysisIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisCopy: { flex: 1 },
  analysisTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  analysisMeta: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  inlineAction: { marginTop: 16, borderRadius: 18, borderWidth: 1, padding: 16 },
  inlineActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineActionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
});
