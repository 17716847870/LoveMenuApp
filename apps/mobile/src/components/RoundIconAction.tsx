import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme/useAppTheme';

type RoundIconActionProps = {
  icon: ReactNode;
  onPress: () => void;
  size?: number;
  floating?: boolean;
  bottomOffset?: number;
  variant?: 'primary' | 'surface';
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

export function RoundIconAction({
  icon,
  onPress,
  size,
  floating = false,
  bottomOffset = 30,
  variant = 'primary',
  style,
}: RoundIconActionProps) {
  const theme = useAppTheme();
  const primary = variant === 'primary';
  const actionSize = size ?? (floating ? 58 : 72);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        floating ? styles.floating : null,
        floating ? { bottom: bottomOffset } : null,
        {
          width: actionSize,
          height: actionSize,
          borderRadius: actionSize / 2,
          backgroundColor: primary ? theme.colors.primary : theme.colors.surface,
          borderColor: primary ? withAlpha(theme.colors.primaryDeep, 0.08) : withAlpha(theme.colors.cardBorder, 0.72),
          shadowColor: primary ? withAlpha(theme.colors.primary, 0.28) : theme.colors.shadow,
          opacity: pressed ? 0.86 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 8,
  },
  floating: {
    position: 'absolute',
    right: 24,
    zIndex: 20,
    shadowRadius: 24,
  },
});
