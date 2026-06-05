import { Image, StyleSheet, Text, View } from 'react-native';

import { getThemeArtwork } from '../theme/themeArtwork';
import { ThemeName } from '../theme/themes';
import { useAppTheme } from '../theme/useAppTheme';

type ThemeMotifProps = {
  themeName: ThemeName;
  variant?: 'hero' | 'card' | 'button' | 'tab';
  routeName?: 'Home' | 'Menu' | 'Orders' | 'Profile';
  active?: boolean;
};

export function ThemeMotif({ themeName, variant = 'card', routeName = 'Home', active = false }: ThemeMotifProps) {
  const theme = useAppTheme();
  const artwork = getThemeArtwork(themeName);
  const scale = variant === 'hero' ? 1.18 : variant === 'tab' ? 1 : variant === 'card' ? 1.08 : 0.96;

  if (themeName === '情侣主题') {
    return (
      <View style={[styles.wrap, { transform: [{ scale }] }]}>
        <Text style={[styles.glyph, { color: active ? theme.colors.primaryDeep : theme.colors.badgeText }]}>
          {routeName === 'Orders' ? '✦' : routeName === 'Menu' ? '♡' : routeName === 'Profile' ? '❥' : '♥'}
        </Text>
      </View>
    );
  }

  if (themeName === '可爱主题') {
    return (
      <View style={[styles.wrap, { transform: [{ scale }] }]}>
        <View style={[styles.bubble, { backgroundColor: theme.colors.primarySoft }]} />
        <Text style={[styles.glyph, { color: active ? theme.colors.primaryDeep : theme.colors.badgeText }]}>
          {routeName === 'Orders' ? '✿' : routeName === 'Menu' ? '★' : routeName === 'Profile' ? '◡' : '☁'}
        </Text>
      </View>
    );
  }

  if (themeName === '夜间主题') {
    return (
      <View style={[styles.wrap, { transform: [{ scale }] }]}>
        <View style={[styles.moonOuter, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt }]}>
          <View style={[styles.moonInner, { backgroundColor: theme.colors.tabBar }]} />
        </View>
        <View style={[styles.star, { backgroundColor: theme.colors.accent }]} />
      </View>
    );
  }

  const imageSource =
    routeName === 'Menu'
      ? artwork.tabMenu
      : routeName === 'Orders'
        ? artwork.tabOrders
        : routeName === 'Profile'
          ? artwork.tabProfile
          : artwork.tabHome;

  if (imageSource) {
    return (
      <View style={[styles.wrap, { transform: [{ scale }] }]}>
        <Image
          source={imageSource}
          style={[
            variant === 'tab' ? styles.themeImageTab : variant === 'card' ? styles.themeImageCard : styles.themeImage,
            active ? styles.themeImageActive : null,
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { transform: [{ scale }] }]}>
      {routeName === 'Menu' ? (
        <View style={styles.pocketWrap}>
          <View style={[styles.pocketTop, { backgroundColor: '#ffffff', borderColor: theme.colors.primaryDeep }]} />
          <View style={[styles.pocketBody, { backgroundColor: '#ffffff', borderColor: theme.colors.primaryDeep }]}>
            <View style={[styles.pocketLine, { backgroundColor: theme.colors.danger }]} />
          </View>
        </View>
      ) : routeName === 'Orders' ? (
        <View style={styles.propellerWrap}>
          <View style={[styles.propellerWingLeft, { backgroundColor: theme.colors.secondary }]} />
          <View style={[styles.propellerWingRight, { backgroundColor: theme.colors.secondary }]} />
          <View style={[styles.propellerCore, { backgroundColor: theme.colors.primaryDeep }]} />
        </View>
      ) : (
        <View style={styles.bellWrap}>
          <View style={[styles.bellTop, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.bellBody, { backgroundColor: theme.colors.secondary, borderColor: theme.colors.primaryDeep }]}>
            <View style={[styles.bellLine, { backgroundColor: theme.colors.danger }]} />
            <View style={[styles.bellDot, { backgroundColor: theme.colors.primaryDeep }]} />
          </View>
        </View>
      )}
    </View>
  );
}

export function ThemeTabIcon({
  themeName,
  routeName,
  active,
}: {
  themeName: ThemeName;
  routeName: 'Home' | 'Menu' | 'Orders' | 'Profile';
  active: boolean;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.tabContainer,
        {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          opacity: active ? 1 : 0.92,
        },
      ]}
    >
      <ThemeMotif themeName={themeName} variant="tab" routeName={routeName} active={active} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeImage: {
    width: 24,
    height: 24,
  },
  themeImageCard: {
    width: 54,
    height: 54,
  },
  themeImageTab: {
    width: 32,
    height: 32,
  },
  themeImageActive: {
    transform: [{ scale: 1.06 }],
  },
  glyph: {
    fontSize: 18,
    fontWeight: '700',
  },
  bubble: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 999,
    opacity: 0.9,
  },
  moonOuter: {
    width: 20,
    height: 20,
    borderRadius: 999,
    overflow: 'hidden',
  },
  moonInner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 999,
    right: -2,
    top: 2,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 999,
    top: 4,
    right: 3,
  },
  bellWrap: {
    alignItems: 'center',
  },
  bellTop: {
    width: 12,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: -2,
  },
  bellBody: {
    width: 18,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellLine: {
    position: 'absolute',
    width: 12,
    height: 2,
    borderRadius: 999,
    bottom: 6,
  },
  bellDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 999,
    bottom: 2,
  },
  pocketWrap: {
    alignItems: 'center',
  },
  pocketTop: {
    width: 18,
    height: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1.2,
    borderBottomWidth: 0,
  },
  pocketBody: {
    width: 20,
    height: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -1,
  },
  pocketLine: {
    width: 12,
    height: 2,
    borderRadius: 999,
  },
  propellerWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propellerWingLeft: {
    position: 'absolute',
    width: 12,
    height: 7,
    borderRadius: 8,
    left: 1,
    top: 7,
    transform: [{ rotate: '-18deg' }],
  },
  propellerWingRight: {
    position: 'absolute',
    width: 12,
    height: 7,
    borderRadius: 8,
    right: 1,
    top: 7,
    transform: [{ rotate: '18deg' }],
  },
  propellerCore: {
    width: 6,
    height: 14,
    borderRadius: 999,
  },
  tabContainer: {
    width: 34,
    height: 34,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
});
