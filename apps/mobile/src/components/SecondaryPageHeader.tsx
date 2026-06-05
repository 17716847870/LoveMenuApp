import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme/useAppTheme';

type SecondaryPageHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  icon?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
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

export function SecondaryPageHeader({ title, subtitle, onBack, icon, right, style }: SecondaryPageHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }, style]}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: theme.dark ? withAlpha(theme.colors.surfaceAlt, 0.94) : theme.colors.surfaceAlt,
            borderColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.52 : 0.95),
            shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.2 : 0.16),
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <ArrowLeft size={24} color={theme.colors.primary} strokeWidth={2.2} />
      </Pressable>

      <View style={styles.copyRow}>
        {icon ? <View style={[styles.iconWrap, { backgroundColor: theme.colors.secondarySoft }]}>{icon}</View> : null}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rightSlot}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  copyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flexShrink: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'left',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'left',
  },
  rightSlot: {
    minWidth: 0,
    alignItems: 'flex-end',
  },
});
