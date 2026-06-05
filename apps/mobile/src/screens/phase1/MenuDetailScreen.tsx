import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CakeSlice, ChevronLeft, Flame, Heart, Info, NotebookText, TimerReset } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAppDialog } from '../../components/AppDialog';
import { AppTopBar } from '../../components/AppTopBar';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'MenuDetail'>;

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

export function MenuDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { menus, menuCategories, previewRole } = useAppStore();
  const menu = menus.find((item) => item.id === route.params.menuId);

  if (!menu) {
    return null;
  }

  const category = menuCategories.find((item) => item.id === menu.category_id);
  const panelBorder = theme.dark ? withAlpha(theme.colors.cardBorder, 0.34) : theme.colors.cardBorder;
  const panelShadow = withAlpha(theme.colors.primary, theme.dark ? 0.16 : 0.1);
  const overlayButton = theme.dark ? withAlpha(theme.colors.card, 0.74) : 'rgba(255,255,255,0.76)';
  const surfaceLow = theme.dark ? withAlpha(theme.colors.surfaceAlt, 0.9) : withAlpha(theme.colors.surfaceAlt, 0.78);

  const handlePrimaryAction = () => {
    if (previewRole === 'publisher') {
      navigation.navigate('MenuForm', { menuId: menu.id });
      return;
    }

    if (!menu.is_published) {
      dialog.alert('暂不可下单', '当前菜单未上架');
      return;
    }

    navigation.navigate('OrderConfirm', { menuId: menu.id });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerOverlay}>
        <AppTopBar
          title=""
          variant="overlay"
          left={
            <Pressable
              style={[styles.overlayButton, { backgroundColor: overlayButton, borderColor: panelBorder }]}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={22} color={theme.colors.primary} strokeWidth={2.2} />
            </Pressable>
          }
          right={
            <Pressable style={[styles.overlayButton, { backgroundColor: overlayButton, borderColor: panelBorder }]}>
              <Heart size={18} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />
            </Pressable>
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 112, 132) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          {menu.cover_image_url ? (
            <Image source={{ uri: menu.cover_image_url }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: surfaceLow }]} />
          )}
          <Svg pointerEvents="none" style={styles.heroFade} viewBox="0 0 100 120" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="detail-hero-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={theme.colors.surface} stopOpacity={0} />
                <Stop offset="36%" stopColor={theme.colors.surface} stopOpacity={0.3} />
                <Stop offset="72%" stopColor={theme.colors.surface} stopOpacity={0.6} />
                <Stop offset="100%" stopColor={theme.colors.surface} stopOpacity={0.9} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="120" fill="url(#detail-hero-fade)" />
          </Svg>
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.titleCard,
              { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor: panelShadow },
            ]}
          >
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{menu.title}</Text>
                <View style={styles.heatRow}>
                  <Flame size={16} color={theme.colors.secondary} strokeWidth={2.2} />
                  <Text style={[styles.heatText, { color: theme.colors.textMuted }]}>{menu.heat_score}% 甜蜜度</Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.85), borderColor: panelBorder },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: menu.is_published ? theme.colors.primary : theme.colors.textMuted },
                  ]}
                >
                  {menu.is_published ? '营业中' : '未上架'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: surfaceLow }]}>
              <View style={[styles.statIconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.8) }]}>
                <CakeSlice size={18} color={theme.colors.primary} strokeWidth={2.1} />
              </View>
              <View>
                <Text style={[styles.statLabel, { color: theme.colors.textSoft }]}>分类</Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{category?.name ?? '未分类'}</Text>
              </View>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.55), borderColor: panelBorder },
              ]}
            >
              <View style={[styles.statIconWrap, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.95) }]}>
                <TimerReset size={18} color={theme.colors.secondary} strokeWidth={2.1} />
              </View>
              <View>
                <Text style={[styles.statLabel, { color: theme.colors.textSoft }]}>余量</Text>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>仅剩 {menu.available_count} 份</Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.panel,
              { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor: panelShadow },
            ]}
          >
            <View style={styles.panelHeading}>
              <NotebookText size={18} color={theme.colors.primary} strokeWidth={2.1} />
              <Text style={[styles.panelTitle, { color: theme.colors.text }]}>详情描述</Text>
            </View>
            <Text style={[styles.panelBody, { color: theme.colors.textMuted }]}>
              {menu.description ?? '柔软香甜，现点现做，为今天准备一份恰到好处的心动。'}
            </Text>
          </View>

          <View style={[styles.tipPanel, { backgroundColor: surfaceLow, borderColor: panelBorder }]}>
            <Info size={18} color={theme.colors.textSoft} strokeWidth={2.1} />
            <View style={styles.tipCopy}>
              <Text style={[styles.tipTitle, { color: theme.colors.text }]}>温馨提示</Text>
              <Text style={[styles.tipBody, { color: theme.colors.textMuted }]}>
                {menu.remark ?? '建议收到后尽快享用，以获得最好的口感体验。'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom + 16, 24),
            backgroundColor: theme.dark ? withAlpha(theme.colors.background, 0.96) : 'rgba(255,255,255,0.84)',
            borderTopColor: panelBorder,
          },
        ]}
      >
        <RomanticGradientButton
          title={previewRole === 'publisher' ? '编辑菜单' : '去下单'}
          onPress={handlePrimaryAction}
          icon={<Heart size={18} color="#ffffff" fill="#ffffff" strokeWidth={2.2} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 120,
  },
  heroWrap: {
    position: 'relative',
    height: 380,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  body: {
    marginTop: -32,
    paddingHorizontal: 24,
    gap: 16,
  },
  titleCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleCopy: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.56,
  },
  heatRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  panel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  panelHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  panelBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  tipPanel: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
});
