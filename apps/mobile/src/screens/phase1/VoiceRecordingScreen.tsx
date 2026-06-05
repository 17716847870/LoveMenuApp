import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Delete, Send, Square } from 'lucide-react-native';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceRecording'>;

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

export function VoiceRecordingScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const [seconds, setSeconds] = useState(14);
  const bars = useMemo(() => [8, 16, 24, 32, 40, 28, 48, 36, 24, 32, 16, 12, 8], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((value) => (value >= 59 ? value : value + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const time = `00:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.glow, styles.glowTop, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.75) }]} />
      <View style={[styles.glow, styles.glowBottom, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.8) }]} />
      <SecondaryPageHeader title="正在聆听..." subtitle="为他/她留下想说的话" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.waveCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: withAlpha(theme.colors.cardBorder, 0.55),
              shadowColor: withAlpha(theme.colors.primary, 0.16),
            },
          ]}
        >
          <View style={styles.waveRow}>
            {bars.map((height, index) => (
              <View
                key={`${height}-${index}`}
                style={[
                  styles.waveBar,
                  {
                    height,
                    backgroundColor:
                      index === 3 || index === 4 || index === 6 || index === 8
                        ? theme.colors.primary
                        : theme.colors.primarySoft,
                    opacity: index === 0 || index === 12 ? 0.3 : index % 2 === 0 ? 0.85 : 0.6,
                  },
                ]}
              />
            ))}
          </View>

          <Text style={[styles.timer, { color: theme.colors.primary }]}>{time}</Text>
          <Text style={[styles.limit, { color: theme.colors.textSoft }]}>最长可录制 60 秒</Text>
        </View>

        <View style={styles.controlRow}>
          <ControlPill
            label="取消"
            onPress={() => navigation.goBack()}
            borderColor={withAlpha(theme.colors.cardBorder, 0.9)}
            icon={<Delete size={18} color={theme.colors.textMuted} strokeWidth={2.1} />}
          />

          <View style={styles.mainRecordWrap}>
            <View style={[styles.pulseOuter, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.35) }]} />
            <View style={[styles.pulseInner, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.6) }]} />
            <Pressable
              style={[
                styles.stopButton,
                { backgroundColor: theme.colors.primary, shadowColor: withAlpha(theme.colors.primaryDeep, 0.35) },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Square size={24} color="#ffffff" fill="#ffffff" strokeWidth={2.2} />
            </Pressable>
          </View>

          <ControlPill
            label="发送"
            onPress={() => navigation.goBack()}
            borderColor={withAlpha(theme.colors.cardBorder, 0.9)}
            icon={<Send size={18} color={theme.colors.primary} strokeWidth={2.1} />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ControlPill({
  icon,
  label,
  onPress,
  borderColor,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  borderColor: string;
}) {
  const theme = useAppTheme();
  return (
    <Pressable style={styles.controlPill} onPress={onPress}>
      <View style={[styles.controlIcon, { backgroundColor: theme.colors.surfaceAlt, borderColor }]}>{icon}</View>
      <Text style={[styles.controlLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTop: {
    top: -60,
    left: -40,
    width: 220,
    height: 220,
    opacity: 0.35,
  },
  glowBottom: {
    right: -50,
    bottom: -40,
    width: 200,
    height: 200,
    opacity: 0.4,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 148,
    paddingBottom: 48,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  waveCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  waveRow: {
    height: 96,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  waveBar: {
    width: 6,
    borderRadius: 999,
  },
  timer: {
    marginTop: 18,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  limit: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  controlRow: {
    marginTop: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlPill: {
    width: 72,
    alignItems: 'center',
    gap: 10,
  },
  controlIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  controlLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  mainRecordWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  pulseInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
});
