import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../store/appStore';
import { ThemeMotif } from './ThemeDecor';
import { getThemeArtwork } from '../theme/themeArtwork';
import { useAppTheme } from '../theme/useAppTheme';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({ title, onPress, variant = 'primary' }: PrimaryButtonProps) {
  const theme = useAppTheme();
  const activeTheme = useAppStore((state) => state.activeTheme);
  const artwork = getThemeArtwork(activeTheme);
  const isPrimary = variant === 'primary';
  const shouldUseStickerOnly = theme.visualStyle === 'illustrated' && Boolean(artwork.buttonSticker);
  const borderRadius = theme.visualStyle === 'playful' ? 24 : theme.visualStyle === 'illustrated' ? 22 : theme.visualStyle === 'night' ? 16 : 18;

  return (
    <Pressable
      style={[
        styles.base,
        {
          borderRadius,
          paddingVertical: theme.visualStyle === 'playful' ? 16 : 14,
        },
        variant === 'secondary'
          ? { backgroundColor: theme.colors.secondarySoft, borderColor: theme.colors.cardBorder }
          : {
              backgroundColor: theme.colors.primary,
              borderColor: theme.visualStyle === 'illustrated' ? theme.colors.primaryDeep : theme.colors.primary,
            },
      ]}
      onPress={onPress}
    >
      <View
        pointerEvents="none"
        style={[
          styles.glossLayer,
          { backgroundColor: variant === 'secondary' ? theme.colors.surface : 'rgba(255,255,255,0.18)' },
        ]}
      />
      <View style={styles.leftAccessory}>
        {shouldUseStickerOnly ? <Image source={artwork.buttonSticker ?? undefined} style={styles.sticker} resizeMode="contain" /> : null}
        {!shouldUseStickerOnly ? <ThemeMotif themeName={activeTheme} variant="button" active={isPrimary} /> : null}
      </View>
      <Text
        style={[
          styles.text,
          { color: variant === 'secondary' ? theme.colors.text : '#ffffff' },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    height: 64,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  glossLayer: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: '52%',
    borderRadius: 999,
    opacity: 0.45,
  },
  leftAccessory: {
    position: 'absolute',
    left: 18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
  },
  text: {
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  sticker: {
    width: 38,
    height: 38,
  },
});
