import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme/useAppTheme';

type FloatingBackButtonProps = {
  onPress: () => void;
  topOffset?: number;
  style?: ViewStyle;
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

export function FloatingBackButton({ onPress, topOffset = 20, style }: FloatingBackButtonProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        {
          top: insets.top + topOffset,
          backgroundColor: theme.dark ? withAlpha(theme.colors.surfaceAlt, 0.94) : theme.colors.surfaceAlt,
          borderColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.52 : 0.95),
          shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.2 : 0.16),
        },
        style,
      ]}
    >
      <ArrowLeft size={22} color={theme.colors.primary} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 40,
  },
});
