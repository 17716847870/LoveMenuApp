import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAppStore } from '../../store/appStore';
import { getThemeArtwork } from '../../theme/themeArtwork';
import { themes, ThemeName } from '../../theme/themes';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'Theme'>;

const themeCopy: Record<ThemeName, string> = {
  情侣主题: '柔和、温暖又浪漫，适合记录两个人的小瞬间。',
  可爱主题: '明亮活泼，带一点元气满满的甜。',
  夜间主题: '适合夜晚使用的深色模式，安静又不刺眼。',
  哆啦A梦主题: '蓝白配色，带一点熟悉的童年感。',
  粉色小猪主题: '柔软粉色调，轻盈可爱，适合甜甜的日常。',
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

export function ThemeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { activeTheme, setTheme } = useAppStore();
  const themeNames = (Object.keys(themes) as ThemeName[]).filter(
    (themeName) => themeName !== '哆啦A梦主题' && themeName !== '粉色小猪主题',
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="主题风格" subtitle="选择今天的视觉心情" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 112 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {themeNames.map((themeName) => {
            const preview = themes[themeName];
            const artwork = getThemeArtwork(themeName);
            const active = activeTheme === themeName;

            return (
              <Pressable
                key={themeName}
                style={[
                  styles.item,
                  {
                    backgroundColor: preview.colors.surface,
                    borderColor: withAlpha(preview.colors.cardBorder, preview.dark ? 0.72 : 0.95),
                    shadowColor: withAlpha(preview.colors.primary, preview.dark ? 0.2 : 0.15),
                  },
                ]}
                onPress={() => setTheme(themeName)}
              >
                {active ? (
                  <View style={styles.activeBadgeWrap}>
                    <View style={[styles.activeBadge, { backgroundColor: preview.colors.primarySoft }]}>
                      <CheckCircle2 size={12} color={preview.colors.badgeText} strokeWidth={2.3} />
                      <Text style={[styles.activeBadgeText, { color: preview.colors.badgeText }]}>使用中</Text>
                    </View>
                  </View>
                ) : null}

                <View style={[styles.previewCover, { backgroundColor: preview.colors.surfaceAlt }]}>
                  {artwork.card ? (
                    <Image source={artwork.card} style={styles.previewImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.previewFallback, { backgroundColor: preview.colors.surfaceAlt }]}>
                      <View
                        style={[
                          styles.previewOrbLarge,
                          { backgroundColor: withAlpha(preview.colors.primarySoft, 0.92) },
                        ]}
                      />
                      <View
                        style={[
                          styles.previewOrbSmall,
                          { backgroundColor: withAlpha(preview.colors.secondarySoft, 0.92) },
                        ]}
                      />
                    </View>
                  )}
                  <View
                    style={[styles.previewShade, { backgroundColor: withAlpha('#000000', preview.dark ? 0.16 : 0.12) }]}
                  />
                </View>

                <View style={styles.itemBody}>
                  <View style={styles.itemCopy}>
                    <Text style={[styles.itemTitle, { color: preview.colors.text }]}>{themeName}</Text>
                    <Text style={[styles.itemDesc, { color: preview.colors.textMuted }]}>{themeCopy[themeName]}</Text>
                  </View>
                  <View
                    style={[
                      styles.selectionRing,
                      { borderColor: active ? preview.colors.primary : withAlpha(preview.colors.cardBorder, 0.9) },
                    ]}
                  >
                    {active ? (
                      <View style={[styles.selectionDot, { backgroundColor: preview.colors.primary }]} />
                    ) : null}
                  </View>
                </View>

                {active ? <View style={[styles.activeOutline, { borderColor: preview.colors.primary }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.saveWrap,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 14,
            backgroundColor: withAlpha(theme.colors.background, 0.96),
          },
        ]}
      >
        <RomanticGradientButton title="保存更改" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  headerText: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.56,
  },
  pageSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  list: {
    gap: 16,
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  activeBadgeWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
  },
  activeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  previewCover: {
    height: 128,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFallback: {
    flex: 1,
    overflow: 'hidden',
  },
  previewOrbLarge: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 999,
    right: -28,
    top: -36,
  },
  previewOrbSmall: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 999,
    left: -18,
    bottom: -24,
  },
  previewShade: {
    position: 'absolute',
    inset: 0,
  },
  itemBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemCopy: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  itemDesc: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  selectionRing: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  activeOutline: {
    position: 'absolute',
    inset: 0,
    borderWidth: 2,
    borderRadius: 16,
  },
  saveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
