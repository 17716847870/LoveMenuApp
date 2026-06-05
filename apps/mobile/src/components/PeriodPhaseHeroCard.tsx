import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { MenstrualPhaseKey } from '../types/period';
import { getPhaseAccentColor } from '../utils/periodPhasePalette';

type ThemeColors = {
  card: string;
  cardBorder: string;
  primary: string;
  primarySoft: string;
  secondarySoft: string;
  text: string;
  textSoft: string;
  textMuted: string;
  surfaceAlt: string;
  badgeText: string;
};

type Props = {
  themeColors: ThemeColors;
  dark: boolean;
  currentPhaseLabel: string;
  currentPhaseKey: MenstrualPhaseKey;
  cycleDay: number;
  periodDuration: number;
  cycleLength: number;
  daysUntilPeriod: number;
  isPredictionReachedButUnconfirmed: boolean;
  overdueDays: number;
};

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

function getNextPhaseLabel(phaseKey: MenstrualPhaseKey) {
  if (phaseKey === 'period') return '卵泡期';
  if (phaseKey === 'follicular') return '排卵期';
  if (phaseKey === 'ovulation') return '黄体期';
  return '经期';
}

function getPrimaryStatusText({
  currentPhaseKey,
  cycleDay,
  periodDuration,
  cycleLength,
  daysUntilPeriod,
}: Pick<Props, 'currentPhaseKey' | 'cycleDay' | 'periodDuration' | 'cycleLength' | 'daysUntilPeriod'>) {
  if (currentPhaseKey === 'period') {
    const remainingDays = Math.max(periodDuration - cycleDay, 0);
    return remainingDays > 0 ? `预计还有 ${remainingDays} 天结束经期` : '经期接近尾声，注意继续观察状态';
  }

  if (currentPhaseKey === 'luteal') {
    return daysUntilPeriod > 0 ? `预计还有 ${daysUntilPeriod} 天来月经` : '预计月经将很快到来';
  }

  if (currentPhaseKey === 'ovulation') {
    const remainingDays = Math.max(cycleLength - cycleDay, 0);
    return remainingDays > 0 ? `预计还有 ${remainingDays} 天来月经` : '预计月经将很快到来';
  }

  return daysUntilPeriod > 0 ? `预计还有 ${daysUntilPeriod} 天来月经` : '系统正在等待你确认下一次经期';
}

function getCycleProgress({
  cycleDay,
  cycleLength,
  isPredictionReachedButUnconfirmed,
  overdueDays,
}: Pick<Props, 'cycleDay' | 'cycleLength' | 'isPredictionReachedButUnconfirmed' | 'overdueDays'>) {
  const effectiveCycleLength = isPredictionReachedButUnconfirmed ? cycleLength + Math.max(overdueDays, 0) : cycleLength;
  const elapsedDays = Math.max(1, Math.min(cycleDay, effectiveCycleLength));
  const progress = Math.max(0.04, Math.min(elapsedDays / Math.max(effectiveCycleLength, 1), 1));

  return {
    elapsedDays,
    effectiveCycleLength,
    progress,
  };
}

export function PeriodPhaseHeroCard({
  themeColors,
  dark,
  currentPhaseLabel,
  currentPhaseKey,
  cycleDay,
  periodDuration,
  cycleLength,
  daysUntilPeriod,
  isPredictionReachedButUnconfirmed,
  overdueDays,
}: Props) {
  const ringSize = 224;
  const center = ringSize / 2;
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const { elapsedDays, effectiveCycleLength, progress } = getCycleProgress({
    cycleDay,
    cycleLength,
    isPredictionReachedButUnconfirmed,
    overdueDays,
  });
  const phaseAccentColor = getPhaseAccentColor(currentPhaseKey);
  const progressOffset = circumference * (1 - progress);
  const primaryStatusText = getPrimaryStatusText({ currentPhaseKey, cycleDay, periodDuration, cycleLength, daysUntilPeriod });
  const nextPhaseLabel = getNextPhaseLabel(currentPhaseKey);
  const secondaryStatusText =
    currentPhaseKey === 'period'
      ? `下一个阶段是 ${nextPhaseLabel}`
      : `当前阶段之后会进入 ${nextPhaseLabel}`;
  const cycleProgressText = isPredictionReachedButUnconfirmed
    ? `本轮周期已走到 ${elapsedDays} / ${effectiveCycleLength} 天，当前比预测晚了 ${overdueDays} 天`
    : `本轮周期已走到 ${elapsedDays} / ${effectiveCycleLength} 天`;

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: dark ? withAlpha(themeColors.card, 0.88) : 'rgba(255,255,255,0.84)',
          borderColor: themeColors.cardBorder,
          shadowColor: withAlpha(themeColors.primary, 0.12),
        },
      ]}
    >
      <View style={[styles.heroGlow, { backgroundColor: withAlpha(themeColors.primarySoft, 0.24) }]} />
      <View style={[styles.heroGlowSecondary, { backgroundColor: withAlpha(themeColors.secondarySoft, 0.3) }]} />
      <Text style={[styles.heroTitle, { color: themeColors.text }]}>当前阶段：{currentPhaseLabel}</Text>
      <View style={styles.heroDialWrap}>
        <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={styles.heroDial}>
          <Circle cx={center} cy={center} r={radius} stroke={withAlpha(themeColors.textSoft, 0.18)} strokeWidth={4} fill="none" />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={phaseAccentColor}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            rotation={-90}
            origin={`${center}, ${center}`}
          />
          <Circle
            cx={center + Math.cos((Math.PI * 2 * progress) - Math.PI / 2) * radius}
            cy={center + Math.sin((Math.PI * 2 * progress) - Math.PI / 2) * radius}
            r={5}
            fill={phaseAccentColor}
          />
        </Svg>
        <View style={styles.heroDialCenter}>
          <Text style={[styles.heroDialCaption, { color: themeColors.textSoft }]}>第</Text>
          <Text style={[styles.heroDay, { color: phaseAccentColor }]}>{cycleDay}</Text>
          <Text style={[styles.heroDialCaption, { color: themeColors.textSoft }]}>天</Text>
        </View>
      </View>
      <Text style={[styles.progressText, { color: themeColors.textMuted }]}>{cycleProgressText}</Text>

      <View style={styles.infoGrid}>
        <View style={[styles.infoCard, { backgroundColor: withAlpha(themeColors.surfaceAlt, 0.8), borderColor: withAlpha(themeColors.primarySoft, 0.45) }]}>
          <Text style={[styles.infoLabel, { color: themeColors.textSoft }]}>阶段提醒</Text>
          <Text style={[styles.infoValue, { color: themeColors.text }]}>{primaryStatusText}</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: withAlpha(themeColors.secondarySoft, 0.58), borderColor: withAlpha(themeColors.primarySoft, 0.35) }]}>
          <Text style={[styles.infoLabel, { color: themeColors.textSoft }]}>下一阶段</Text>
          <Text style={[styles.infoValue, { color: themeColors.text }]}>{secondaryStatusText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
  },
  heroGlow: {
    position: 'absolute',
    right: -36,
    top: -36,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroGlowSecondary: {
    position: 'absolute',
    left: -36,
    bottom: -36,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 18,
    zIndex: 1,
  },
  heroDialWrap: {
    width: 224,
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heroDial: {
    position: 'absolute',
  },
  heroDialCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDialCaption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  heroDay: {
    fontSize: 56,
    lineHeight: 56,
    fontWeight: '700',
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    zIndex: 1,
  },
  infoGrid: {
    marginTop: 18,
    width: '100%',
    gap: 10,
    zIndex: 1,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  infoValue: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
