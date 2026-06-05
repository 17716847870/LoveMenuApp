import { PropsWithChildren } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../store/appStore';
import { ThemeMotif } from './ThemeDecor';
import { getThemeArtwork } from '../theme/themeArtwork';
import { useAppTheme } from '../theme/useAppTheme';

type HeroBannerProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  sideLabel?: string;
  artworkVariant?: 'hero' | 'heroLogin';
}>;

export function HeroBanner({ eyebrow, title, subtitle, sideLabel, artworkVariant = 'hero', children }: HeroBannerProps) {
  const theme = useAppTheme();
  const activeTheme = useAppStore((state) => state.activeTheme);
  const artwork = getThemeArtwork(activeTheme);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.cardBorder,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={styles.decorLayer}>
        <View style={[styles.decorOrbLarge, { backgroundColor: theme.colors.primarySoft }]} />
        <View style={[styles.decorOrbSmall, { backgroundColor: theme.colors.surface }]} />
        <View style={[styles.decorRibbon, { borderColor: theme.colors.cardBorder }]} />
      </View>
      {theme.visualStyle === 'illustrated' && artwork[artworkVariant] ? (
        <Image source={artwork[artworkVariant] ?? undefined} style={styles.heroImage} resizeMode="cover" />
      ) : null}
      <View style={[styles.heroGlass, { borderColor: theme.colors.cardBorder, backgroundColor: theme.dark ? 'rgba(17,24,39,0.28)' : 'rgba(255,255,255,0.42)' }]} />
      <View style={styles.topRow}>
        <Text style={[styles.eyebrow, { color: theme.colors.badgeText, backgroundColor: theme.colors.surface }]}>{eyebrow}</Text>
        <View style={styles.sideWrap}>
          <ThemeMotif themeName={activeTheme} variant="hero" />
          {sideLabel ? <Text style={[styles.sideLabel, { color: theme.colors.textMuted }]}>{sideLabel}</Text> : null}
        </View>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    marginBottom: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  decorOrbLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    top: -70,
    right: -20,
    opacity: 0.75,
  },
  decorOrbSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    bottom: -28,
    left: -18,
    opacity: 0.7,
  },
  heroImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0.34,
  },
  heroGlass: {
    position: 'absolute',
    inset: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  decorRibbon: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 18,
    bottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    opacity: 0.35,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sideWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sideLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    marginTop: 16,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    marginTop: 16,
    gap: 10,
  },
});
