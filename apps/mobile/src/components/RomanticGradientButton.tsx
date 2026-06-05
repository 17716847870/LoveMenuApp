import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAppTheme } from '../theme/useAppTheme';

type RomanticGradientButtonProps = {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: any;
  disabled?: boolean;
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

export function RomanticGradientButton({ title, onPress, icon, style, disabled }: RomanticGradientButtonProps) {
  const theme = useAppTheme();
  const textColor = theme.dark ? theme.colors.background : '#ffffff';
  const [startColor, middleColor, endColor] = theme.gradients.button;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.28 : 0.25) },
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 56" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="romantic-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={startColor} />
            <Stop offset="48%" stopColor={middleColor} />
            <Stop offset="100%" stopColor={endColor} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="56" fill="url(#romantic-gradient)" />
      </Svg>

      <View style={styles.content}>
        {icon}
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.52,
  },
  content: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.18,
  },
});
