import { PropsWithChildren } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '../store/appStore';
import { getThemeArtwork } from '../theme/themeArtwork';
import { useAppTheme } from '../theme/useAppTheme';

export function ScreenContainer({ children }: PropsWithChildren) {
  const theme = useAppTheme();
  const activeTheme = useAppStore((state) => state.activeTheme);
  const artwork = getThemeArtwork(activeTheme);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {theme.visualStyle === 'illustrated' && artwork.background ? <Image source={artwork.background} style={styles.bgImage} resizeMode="cover" /> : null}
      <View pointerEvents="none" style={[styles.glowTop, { backgroundColor: theme.colors.primarySoft }]} />
      <View pointerEvents="none" style={[styles.glowBottom, { backgroundColor: theme.colors.secondarySoft }]} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        <View>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 148,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.18,
  },
  glowTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    top: -90,
    right: -80,
    opacity: 0.35,
  },
  glowBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    bottom: 40,
    left: -100,
    opacity: 0.28,
  },
});
