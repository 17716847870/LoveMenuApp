import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Info,
  Palette,
  Settings,
  UserCog,
} from 'lucide-react-native';

import { PageHeaderBlock } from '../../components/PageHeaderBlock';
import { RootStackParamList, RootTabParamList } from '../../navigation/AppNavigator';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

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

function daysTogether(since: string | null) {
  if (!since) {
    return 0;
  }

  const start = new Date(since).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
}

type MenuGroupProps = {
  title: string;
  items: Array<{
    key: string;
    label: string;
    hint?: string;
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    onPress?: () => void;
  }>;
};

export function ProfileScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const { activeTheme, currentUser, menus, orders, partnerUser, previewRole, relationship } = useAppStore();
  const insets = useSafeAreaInsets();
  const togetherDays = daysTogether(relationship?.together_since ?? null);
  const menuCount = menus.filter((item) => item.status === 'active').length;
  const completedOrders = orders.filter((item) => item.status === 'completed').length;
  const roleLabel = previewRole === 'publisher' ? '今日主厨' : '今日食客';
  const shadowColor = withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.1);
  const panelBorder = theme.dark ? withAlpha(theme.colors.cardBorder, 0.32) : withAlpha(theme.colors.cardBorder, 0.36);

  const relationshipItems: MenuGroupProps['items'] = [
    {
      key: 'moments',
      label: '纪念日',
      icon: CalendarClock,
      onPress: () => navigation.navigate('Anniversaries'),
    },
    {
      key: 'album',
      label: '我们的时光',
      icon: ImageIcon,
      onPress: () => navigation.navigate('Timeline'),
    },
  ];

  const accountItems: MenuGroupProps['items'] = [
    {
      key: 'account',
      label: '账号设置',
      icon: UserCog,
      onPress: () => navigation.navigate('AccountSettings'),
    },
    {
      key: 'theme',
      label: '主题风格',
      hint: activeTheme,
      icon: Palette,
      onPress: () => navigation.navigate('Theme'),
    },
    {
      key: 'settings',
      label: '通用设置',
      icon: Settings,
      onPress: () => navigation.navigate('GeneralSettings'),
    },
    {
      key: 'about',
      label: '关于我们',
      icon: Info,
      onPress: () => navigation.navigate('About'),
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <PageHeaderBlock
        title="我的"
        subtitle="属于我们的主题、菜单和时光记录"
        titleColor={theme.colors.primary}
        subtitleColor={theme.colors.textSoft}
        style={{ marginLeft: 24, marginTop: insets.top }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.primarySoft,
              borderColor: withAlpha(theme.colors.surface, 0.65),
              shadowColor,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[styles.heroGlowTop, { backgroundColor: withAlpha(theme.colors.surface, 0.22) }]}
          />
          <View
            pointerEvents="none"
            style={[styles.heroGlowBottom, { backgroundColor: withAlpha(theme.colors.secondary, 0.18) }]}
          />

          <View style={styles.avatarRow}>
            <View style={[styles.avatarOuter, { borderColor: theme.colors.surface }]}>
              {currentUser?.avatar_url ? (
                <Image source={{ uri: currentUser.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarFallback, { color: theme.colors.primary }]}>
                  {(currentUser?.nickname ?? 'L').slice(0, 1)}
                </Text>
              )}
            </View>
            <View style={[styles.avatarOuter, styles.avatarOverlap, { borderColor: theme.colors.surface }]}>
              {partnerUser?.avatar_url ? (
                <Image source={{ uri: partnerUser.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarFallback, { color: theme.colors.primary }]}>
                  {(partnerUser?.nickname ?? 'M').slice(0, 1)}
                </Text>
              )}
            </View>
            <View style={styles.heartBadge}>
              <Heart size={18} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />
            </View>
          </View>

          <Text
            style={[styles.heroNames, { color: theme.colors.badgeText }]}
          >{`${currentUser?.nickname ?? '你'} & ${partnerUser?.nickname ?? 'Ta'}`}</Text>
          <Text style={[styles.heroDays, { color: withAlpha(theme.colors.badgeText, 0.82) }]}>
            相恋 <Text style={[styles.heroDaysStrong, { color: theme.colors.primary }]}>{togetherDays}</Text> 天
          </Text>

          <View
            style={[
              styles.rolePill,
              {
                backgroundColor: withAlpha(theme.colors.surface, 0.82),
                borderColor: withAlpha(theme.colors.surface, 0.5),
              },
            ]}
          >
            <CheckCircle2 size={16} color={theme.colors.primary} strokeWidth={2.4} />
            <Text style={[styles.rolePillText, { color: theme.colors.badgeText }]}>{`当前身份: ${roleLabel}`}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View
            style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor }]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.9) }]}>
              <CalendarClock size={18} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{menuCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>专属菜单</Text>
          </View>

          <View
            style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor }]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.9) }]}>
              <CheckCircle2 size={18} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{completedOrders}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>完成订单</Text>
          </View>
        </View>

        <MenuGroup title="relationship" items={relationshipItems} />
        <MenuGroup title="account" items={accountItems} />
      </ScrollView>
    </View>
  );

  function MenuGroup({ items }: MenuGroupProps) {
    return (
      <View
        style={[styles.groupCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor }]}
      >
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <Pressable key={item.key} style={styles.groupRow} onPress={item.onPress}>
              <View style={styles.groupRowLeft}>
                <View
                  style={[
                    styles.groupIconWrap,
                    {
                      backgroundColor: withAlpha(theme.colors.primarySoft, 0.66),
                    },
                  ]}
                >
                  <Icon size={18} color={theme.colors.primary} strokeWidth={2.1} />
                </View>
                <Text style={[styles.groupLabel, { color: theme.colors.text }]}>{item.label}</Text>
              </View>
              <View style={styles.groupRowRight}>
                {item.hint ? (
                  <Text
                    style={[
                      styles.groupHint,
                      { color: theme.colors.primary, backgroundColor: withAlpha(theme.colors.primarySoft, 0.4) },
                    ]}
                  >
                    {item.hint}
                  </Text>
                ) : null}
                <ChevronRight size={18} color={theme.colors.textSoft} strokeWidth={2.2} />
              </View>
              {index < items.length - 1 ? (
                <View style={[styles.groupDivider, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.45) }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingTop: 5,
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 24,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  heroGlowTop: {
    position: 'absolute',
    top: -46,
    right: -46,
    width: 160,
    height: 160,
    borderRadius: 999,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 999,
  },
  avatarRow: {
    width: 148,
    height: 80,
  },
  avatarOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: {
    position: 'absolute',
    left: 68,
    top: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  heartBadge: {
    position: 'absolute',
    left: 60,
    top: 26,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNames: {
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  heroDays: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  heroDaysStrong: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  rolePill: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  groupRow: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  groupRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 118,
  },
  groupIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  groupRowRight: {
    position: 'absolute',
    right: 8,
    top: 16,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupHint: {
    overflow: 'hidden',
    borderRadius: 999,
    height: 24,
    paddingHorizontal: 8,
    fontSize: 10,
    lineHeight: 24,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
  groupDivider: {
    height: 1,
    marginTop: 12,
    marginLeft: 44,
  },
});
