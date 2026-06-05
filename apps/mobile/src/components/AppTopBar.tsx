import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme/useAppTheme';

export type AppTopBarMode = 'title' | 'brand';
export type AppTopBarVariant = 'glass' | 'overlay';

type AppTopBarProps = {
  title: string;
  mode?: AppTopBarMode;
  variant?: AppTopBarVariant;
  left?: ReactNode;
  right?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
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

export function AppTopBar({ title, mode = 'title', variant = 'glass', left, right, showBackButton = false, onBack }: AppTopBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const backgroundColor = variant === 'overlay' ? 'transparent' : theme.dark ? withAlpha(theme.colors.card, 0.88) : 'rgba(255,255,255,0.78)';
  const borderColor =
    variant === 'overlay' ? 'transparent' : withAlpha(theme.colors.cardBorder, theme.dark ? 0.72 : 0.76);
  const titleColor = theme.colors.primary;
  const shadowColor = variant === 'overlay' ? 'transparent' : withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.1);

  const leftNode =
    left ??
    (showBackButton ? (
      <Pressable style={styles.sideButton} onPress={onBack}>
        <ChevronLeft size={24} color={titleColor} strokeWidth={2.3} />
      </Pressable>
    ) : (
      <View style={styles.sideSpacer} />
    ));

  const rightNode = right ?? <View style={styles.sideSpacer} />;

  return (
    <View
      style={[
        styles.shell,
        {
          paddingTop: insets.top,
          backgroundColor,
          borderBottomColor: borderColor,
          shadowColor,
        },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.side}>{leftNode}</View>

        {mode === 'brand' ? (
          <View style={styles.brandWrap}>
            <Heart size={18} color={titleColor} fill={titleColor} strokeWidth={2.2} />
            <Text style={[styles.title, styles.brandTitle, { color: titleColor }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : (
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
        )}

        <View style={styles.side}>{rightNode}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
  },
  bar: {
    height: 64,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSpacer: {
    width: 36,
    height: 36,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  brandWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  brandTitle: {
    flexGrow: 0,
    flexShrink: 1,
    textAlign: 'left',
  },
});
