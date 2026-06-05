import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Bell,
  CalendarDays,
  Camera,
  ChefHat,
  Clock3,
  Dices,
  Heart,
  Lock,
  ReceiptText,
  Sparkles,
  UserRound,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { PeriodPhaseHeroCard } from '../../components/PeriodPhaseHeroCard';
import { RootStackParamList, RootTabParamList } from '../../navigation/AppNavigator';
import { periodApi } from '../../services/periodApi';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { HomeSummaryResponse } from '../../types/phaseOne';
import { PeriodHomeOverviewDto, PeriodPermissionDto } from '../../types/period';
import { periodHomeOverviewEmpty } from '../../utils/periodEmptyState';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Home'>,
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

export function HomeScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const { currentUser, partnerUser, relationship, menus, orders, previewRole, loadBootstrap } = useAppStore();
  const [periodOverview, setPeriodOverview] = useState<PeriodHomeOverviewDto>(periodHomeOverviewEmpty);
  const [periodPermission, setPeriodPermission] = useState<PeriodPermissionDto | null>(null);
  const [homeSummary, setHomeSummary] = useState<HomeSummaryResponse | null>(null);
  const [isRefreshingHome, setIsRefreshingHome] = useState(false);
  const mountedRef = useRef(true);

  const isPublisher = (homeSummary?.role ?? previewRole) === 'publisher';
  const isFemaleViewer = periodPermission?.canManagePermission ?? currentUser?.gender === 'female';
  const overviewAllowsPartnerPeriod = periodOverview.maleViewEnabled || periodOverview.maleEditEnabled;
  const overviewHasSharedPeriodData =
    periodOverview.currentPhaseLabel !== '等待授权' && periodOverview.nextPeriodDateLabel.length > 0;
  const canShowPartnerPeriodOnHome =
    !isFemaleViewer &&
    Boolean(
      periodPermission?.maleViewEnabled ||
      periodPermission?.maleEditEnabled ||
      overviewAllowsPartnerPeriod ||
      overviewHasSharedPeriodData,
    );
  const canPartnerEditPeriod = Boolean(periodPermission?.maleEditEnabled || periodOverview.maleEditEnabled);
  const publishedMenus = menus.filter((item) => item.is_published);
  const pendingOrders = orders.filter((item) => item.status === 'pending');
  const activeOrders = orders.filter((item) => item.status === 'pending' || item.status === 'accepted');
  const completedOrders = orders.filter((item) => item.status === 'completed');
  const topMenu = publishedMenus[0];
  const hottestMenu = [...publishedMenus].sort((a, b) => b.completed_order_count - a.completed_order_count)[0];
  const limitedMenus = publishedMenus.filter((item) => item.is_limited);
  const summaryTopMenu = homeSummary?.top_menu ?? topMenu ?? null;
  const summaryHottestMenu = homeSummary?.hottest_menu ?? hottestMenu ?? null;
  const summaryFocusOrder = homeSummary?.focus_order ?? (isPublisher ? pendingOrders[0] : activeOrders[0]) ?? null;
  const publishedMenuCount = homeSummary?.published_menu_count ?? publishedMenus.length;
  const pendingOrderCount = homeSummary?.pending_order_count ?? pendingOrders.length;
  const activeOrderCount = homeSummary?.active_order_count ?? activeOrders.length;
  const completedOrderCount = homeSummary?.completed_order_count ?? completedOrders.length;
  const limitedMenuCount = homeSummary?.limited_menu_count ?? limitedMenus.length;
  const avatarText = currentUser?.nickname?.slice(0, 1) ?? '爱';
  const partnerNickname = partnerUser?.nickname ?? '另一半';
  const togetherDays = relationship?.together_since
    ? Math.max(1, Math.floor((Date.now() - new Date(relationship.together_since).getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const summaryTogetherDays = homeSummary?.together_days ?? togetherDays;

  const cardShadow = withAlpha(theme.colors.primary, theme.dark ? 0.16 : 0.12);
  const topBorder = withAlpha(theme.colors.cardBorder, theme.dark ? 0.72 : 0.8);
  const panelBackground = theme.dark ? withAlpha(theme.colors.card, 0.96) : theme.colors.surface;
  const showcaseMenu = isPublisher ? summaryHottestMenu : summaryTopMenu;
  const statusTone = isPublisher ? theme.colors.secondary : theme.colors.primary;
  const statusText = isPublisher
    ? pendingOrderCount > 0
      ? `今天有 ${pendingOrderCount} 个订单等你处理`
      : `今天菜单区很安静，可以准备新的惊喜菜品`
    : activeOrderCount > 0
      ? `你有 ${activeOrderCount} 个订单正在推进中`
      : `今天还没有新的点单，去看看想吃什么吧`;
  const roleTitle = isPublisher ? '今天的厨房工作台' : '今天想吃点什么';
  const roleSubtitle = isPublisher
    ? `你负责发布菜单，${partnerNickname} 会从你准备的菜里下单。`
    : `${partnerNickname} 今天也许会为你准备一顿好吃的，先看看菜单再决定。`;
  const overviewCards = isPublisher
    ? [
        {
          key: 'pending',
          label: '待处理订单',
          value: pendingOrderCount,
          suffix: '个',
          hint: pendingOrderCount > 0 ? '先处理最早一单' : '暂时没有新的催单',
          icon: ReceiptText,
          tone: theme.colors.secondary,
          glow: withAlpha(theme.colors.secondarySoft, 0.45),
          iconBg: theme.colors.primarySoft,
        },
        {
          key: 'menus',
          label: '已上架菜单',
          value: publishedMenuCount,
          suffix: '道',
          hint: limitedMenuCount > 0 ? `${limitedMenuCount} 道限量菜需要留意` : '可以考虑新增本周菜单',
          icon: ChefHat,
          tone: theme.colors.primary,
          glow: withAlpha(theme.colors.primarySoft, 0.45),
          iconBg: theme.colors.secondarySoft,
        },
      ]
    : [
        {
          key: 'available',
          label: '可点菜单',
          value: publishedMenuCount,
          suffix: '道',
          hint: summaryTopMenu ? `最热的是 ${summaryTopMenu.title}` : '今天先去逛逛菜单',
          icon: ChefHat,
          tone: theme.colors.primary,
          glow: withAlpha(theme.colors.primarySoft, 0.45),
          iconBg: theme.colors.secondarySoft,
        },
        {
          key: 'orders',
          label: '进行中订单',
          value: activeOrderCount,
          suffix: '单',
          hint: activeOrderCount > 0 ? '可以随时回看进度' : '还没有发起新的点单',
          icon: Clock3,
          tone: theme.colors.secondary,
          glow: withAlpha(theme.colors.secondarySoft, 0.45),
          iconBg: theme.colors.primarySoft,
        },
      ];

  const quickActions = isPublisher
    ? [
        { key: 'menu', label: '管理菜单', icon: ChefHat, onPress: () => navigation.navigate('Menu') },
        { key: 'orders', label: '处理订单', icon: ReceiptText, onPress: () => navigation.navigate('Orders') },
        { key: 'stats', label: '看看数据', icon: Sparkles, onPress: () => navigation.navigate('Stats') },
        { key: 'space', label: '发到空间', icon: Camera, onPress: () => navigation.navigate('Timeline') },
        { key: 'period', label: '经期提醒', icon: CalendarDays, onPress: () => navigation.navigate('Period') },
        { key: 'wheel', label: '灵感转盘', icon: Dices, onPress: () => navigation.navigate('Wheel') },
      ]
    : [
        { key: 'menu', label: '去点单', icon: ChefHat, onPress: () => navigation.navigate('Menu') },
        { key: 'orders', label: '我的订单', icon: ReceiptText, onPress: () => navigation.navigate('Orders') },
        { key: 'period', label: '经期提醒', icon: CalendarDays, onPress: () => navigation.navigate('Period') },
        { key: 'space', label: '情侣空间', icon: Camera, onPress: () => navigation.navigate('Timeline') },
        { key: 'wheel', label: '灵感转盘', icon: Dices, onPress: () => navigation.navigate('Wheel') },
        { key: 'anniversary', label: '纪念日', icon: Sparkles, onPress: () => navigation.navigate('Anniversaries') },
      ];

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshHomeData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshingHome(true);
      }

      const [overviewResult, summaryResult, permissionResult] = await Promise.allSettled([
        periodApi.getHomeOverview(),
        phaseOneApi.getHomeSummary(),
        periodApi.getPermissions(),
        loadBootstrap(),
      ]);

      if (!mountedRef.current) {
        return;
      }

      if (overviewResult.status === 'fulfilled') {
        setPeriodOverview(overviewResult.value.data);
      } else {
        setPeriodOverview(periodHomeOverviewEmpty);
      }

      if (summaryResult.status === 'fulfilled') {
        setHomeSummary(summaryResult.value.data);
      } else {
        setHomeSummary(null);
      }

      if (permissionResult.status === 'fulfilled') {
        setPeriodPermission(permissionResult.value.data);
      } else {
        setPeriodPermission(null);
      }

      if (showRefreshing) {
        setIsRefreshingHome(false);
      }
    },
    [loadBootstrap],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshHomeData();
    }, [refreshHomeData]),
  );

  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      void refreshHomeData(true);
    });
  }, [navigation, refreshHomeData]);

  const handlePrimaryFocusAction = () => {
    if (isPublisher) {
      navigation.navigate('Orders');
      return;
    }

    if (summaryTopMenu) {
      navigation.navigate('OrderConfirm', { menuId: summaryTopMenu.id });
      return;
    }

    navigation.navigate('Menu');
  };

  const handleShowcaseAction = () => {
    if (!showcaseMenu) {
      return;
    }

    if (isPublisher) {
      navigation.navigate('MenuDetail', { menuId: showcaseMenu.id });
      return;
    }

    navigation.navigate('OrderConfirm', { menuId: showcaseMenu.id });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 132 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingHome}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            onRefresh={() => refreshHomeData(true)}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeSection}>
          <View>
            <Text style={[styles.greetingLabel, { color: theme.colors.textMuted }]}>早上好，</Text>
            <Text style={[styles.greetingTitle, { color: theme.colors.text }]}>
              {roleTitle} <Text style={{ color: theme.colors.primary }}>✨</Text>
            </Text>
            <Text style={[styles.greetingSubtext, { color: theme.colors.textMuted }]}>{roleSubtitle}</Text>
          </View>

          <View
            style={[
              styles.avatarWrap,
              {
                borderColor: withAlpha(theme.colors.primarySoft, 0.95),
                shadowColor: cardShadow,
                backgroundColor: theme.colors.secondarySoft,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{avatarText}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusStrip,
            {
              backgroundColor: withAlpha(statusTone, 0.1),
              borderColor: withAlpha(statusTone, 0.2),
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
          <Text style={[styles.statusStripText, { color: theme.colors.text }]}>{statusText}</Text>
        </View>

        <View style={styles.overviewGrid}>
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <View
                key={card.key}
                style={[
                  styles.overviewCard,
                  {
                    backgroundColor: panelBackground,
                    borderColor: topBorder,
                    shadowColor: cardShadow,
                  },
                ]}
              >
                <View pointerEvents="none" style={[styles.overviewGlow, { backgroundColor: card.glow }]} />
                <View style={styles.overviewTop}>
                  <View style={[styles.overviewIconWrap, { backgroundColor: card.iconBg }]}>
                    <Icon size={16} color={card.tone} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.overviewLabel, { color: theme.colors.textMuted }]}>{card.label}</Text>
                </View>
                <View style={styles.overviewValueRow}>
                  <Text style={[styles.overviewValue, { color: card.tone }]}>{card.value}</Text>
                  <Text style={[styles.overviewSuffix, { color: theme.colors.textMuted }]}>{card.suffix}</Text>
                </View>
                <Text style={[styles.overviewHint, { color: theme.colors.textMuted }]}>{card.hint}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          {isFemaleViewer ? (
            <PeriodPhaseHeroCard
              themeColors={theme.colors}
              dark={theme.dark}
              currentPhaseLabel={periodOverview.currentPhaseLabel}
              currentPhaseKey={periodOverview.currentPhaseKey}
              cycleDay={periodOverview.cycleDay}
              periodDuration={periodOverview.periodDuration}
              cycleLength={periodOverview.cycleLength}
              daysUntilPeriod={periodOverview.daysUntilPeriod}
              isPredictionReachedButUnconfirmed={periodOverview.isPredictionReachedButUnconfirmed}
              overdueDays={periodOverview.overdueDays}
            />
          ) : canShowPartnerPeriodOnHome ? (
            <View
              style={[
                styles.authorizationCard,
                {
                  backgroundColor: panelBackground,
                  borderColor: topBorder,
                  shadowColor: cardShadow,
                },
              ]}
            >
              <View style={styles.authorizationHeroRow}>
                <View
                  style={[styles.authorizationIconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.18) }]}
                >
                  <CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.authorizationHeroCopy}>
                  <Text style={[styles.authorizationEyebrow, { color: theme.colors.textSoft }]}>已授权查看</Text>
                  <Text style={[styles.authorizationTitle, { color: theme.colors.text }]}>她的周期状态</Text>
                </View>
              </View>
              <View style={styles.authorizationBadgeRow}>
                <View
                  style={[styles.authorizationBadge, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.18) }]}
                >
                  <Text style={[styles.authorizationBadgeText, { color: theme.colors.primary }]}>
                    {periodOverview.currentPhaseLabel}
                  </Text>
                </View>
                <View
                  style={[styles.authorizationBadge, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.5) }]}
                >
                  <Text style={[styles.authorizationBadgeText, { color: theme.colors.secondary }]}>
                    第 {periodOverview.cycleDay} 天
                  </Text>
                </View>
                {canPartnerEditPeriod ? (
                  <View
                    style={[styles.authorizationBadge, { backgroundColor: withAlpha(theme.colors.primaryDeep, 0.12) }]}
                  >
                    <Text style={[styles.authorizationBadgeText, { color: theme.colors.primaryDeep }]}>可代为记录</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.authorizationMetricRow}>
                <View
                  style={[
                    styles.authorizationMetricCard,
                    { backgroundColor: withAlpha(theme.colors.primarySoft, 0.1) },
                  ]}
                >
                  <Text style={[styles.authorizationMetricValue, { color: theme.colors.text }]}>
                    {periodOverview.currentPhaseKey === 'period'
                      ? `还有 ${Math.max(periodOverview.periodDuration - periodOverview.cycleDay, 0)} 天`
                      : `还有 ${periodOverview.daysUntilPeriod} 天`}
                  </Text>
                  <Text style={[styles.authorizationMetricLabel, { color: theme.colors.textSoft }]}>
                    {periodOverview.currentPhaseKey === 'period' ? '预计结束经期' : '预计下次经期'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.authorizationMetricCard,
                    { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.36) },
                  ]}
                >
                  <Text style={[styles.authorizationMetricValue, { color: theme.colors.text }]}>
                    {periodOverview.nextPeriodDateLabel}
                  </Text>
                  <Text style={[styles.authorizationMetricLabel, { color: theme.colors.textSoft }]}>预测日期</Text>
                </View>
              </View>
              <Pressable
                style={[styles.authorizationButton, { backgroundColor: theme.colors.primaryDeep }]}
                onPress={() => navigation.navigate('Period')}
              >
                <Text style={styles.authorizationButtonText}>去看经期页</Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={[
                styles.authorizationCard,
                {
                  backgroundColor: panelBackground,
                  borderColor: topBorder,
                  shadowColor: cardShadow,
                },
              ]}
            >
              <View style={styles.authorizationHeroRow}>
                <View
                  style={[styles.authorizationIconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.18) }]}
                >
                  <CalendarDays size={18} color={theme.colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.authorizationHeroCopy}>
                  <Text style={[styles.authorizationEyebrow, { color: theme.colors.textSoft }]}>等待授权</Text>
                  <Text style={[styles.authorizationTitle, { color: theme.colors.text }]}>经期状态暂不可见</Text>
                </View>
              </View>
              <Text style={[styles.authorizationLockedText, { color: theme.colors.textMuted }]}>
                对方开启“允许查看经期状态”后，这里才会展示周期阶段和预测日期。
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>今日重点</Text>
          <View
            style={[
              styles.focusCard,
              {
                backgroundColor: panelBackground,
                borderColor: topBorder,
                shadowColor: cardShadow,
              },
            ]}
          >
            <View style={styles.focusHeader}>
              <View
                style={[
                  styles.focusIconWrap,
                  { backgroundColor: isPublisher ? theme.colors.primarySoft : theme.colors.secondarySoft },
                ]}
              >
                {isPublisher ? (
                  <ReceiptText size={18} color={theme.colors.primary} strokeWidth={2.2} />
                ) : (
                  <ChefHat size={18} color={theme.colors.primary} strokeWidth={2.2} />
                )}
              </View>
              <View style={styles.focusCopy}>
                <Text style={[styles.focusEyebrow, { color: theme.colors.textSoft }]}>
                  {isPublisher ? '今天最该先处理' : '今天最值得先看'}
                </Text>
                <Text style={[styles.focusTitle, { color: theme.colors.text }]}>
                  {isPublisher
                    ? summaryFocusOrder
                      ? `先处理订单 #${summaryFocusOrder.order_no.slice(-4)}`
                      : summaryHottestMenu
                        ? `看看 ${summaryHottestMenu.title} 的热度`
                        : '先去上架第一道菜'
                    : summaryFocusOrder
                      ? `订单 #${summaryFocusOrder.order_no.slice(-4)} 正在进行`
                      : summaryTopMenu
                        ? summaryTopMenu.title
                        : '先去逛逛菜单'}
                </Text>
                <Text style={[styles.focusDesc, { color: theme.colors.textMuted }]}>
                  {isPublisher
                    ? summaryFocusOrder
                      ? '对方已经下单，早点处理会让今天的体验更顺。'
                      : summaryHottestMenu
                        ? `${summaryHottestMenu.completed_order_count} 次完成点单，是你们最近最受欢迎的一道菜。`
                        : '菜单还比较空，现在很适合先补充一两道常点菜。'
                    : summaryFocusOrder
                      ? '可以进订单页看看进度，或者提醒对方你已经在期待了。'
                      : summaryTopMenu
                        ? (summaryTopMenu.description ?? '这道菜现在很适合成为今天的第一单。')
                        : '去菜单页找一道想吃的，今天就从第一单开始。'}
                </Text>
              </View>
            </View>
            <Pressable
              style={[
                styles.focusButton,
                { backgroundColor: isPublisher ? theme.colors.secondary : theme.colors.primaryDeep },
              ]}
              onPress={handlePrimaryFocusAction}
            >
              <Text style={styles.focusButtonText}>
                {isPublisher ? '去处理订单' : summaryTopMenu ? '去点这道菜' : '去看看菜单'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>快捷功能</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((item) => {
              const Icon = item.icon;

              return (
                <Pressable
                  key={item.key}
                  style={[
                    styles.quickCard,
                    {
                      backgroundColor: panelBackground,
                      borderColor: withAlpha(theme.colors.cardBorder, 0.55),
                      shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.12 : 0.08),
                    },
                  ]}
                  onPress={item.onPress}
                >
                  <View
                    style={[
                      styles.quickIconWrap,
                      { backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.26 : 0.42) },
                    ]}
                  >
                    <Icon size={18} color={theme.colors.primary} strokeWidth={2.1} />
                  </View>
                  <Text style={[styles.quickText, { color: theme.colors.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>我们最近</Text>
          <View
            style={[
              styles.coupleCard,
              {
                backgroundColor: panelBackground,
                borderColor: topBorder,
                shadowColor: cardShadow,
              },
            ]}
          >
            <View style={styles.coupleHeader}>
              <View style={[styles.coupleAvatar, { backgroundColor: theme.colors.secondarySoft }]}>
                <UserRound size={18} color={theme.colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.coupleCopy}>
                <Text style={[styles.coupleTitle, { color: theme.colors.text }]}>{partnerNickname}</Text>
                <Text style={[styles.coupleDesc, { color: theme.colors.textMuted }]}>
                  {summaryTogetherDays
                    ? `你们已经一起走过 ${summaryTogetherDays} 天。`
                    : '把今天的点单和心情都留在这里。'}
                </Text>
              </View>
            </View>
            <View style={styles.coupleStatsRow}>
              <View style={[styles.coupleStat, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.18) }]}>
                <Text style={[styles.coupleStatValue, { color: theme.colors.primary }]}>{completedOrderCount}</Text>
                <Text style={[styles.coupleStatLabel, { color: theme.colors.textSoft }]}>已完成订单</Text>
              </View>
              <View style={[styles.coupleStat, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.4) }]}>
                <Text style={[styles.coupleStatValue, { color: theme.colors.secondary }]}>
                  {summaryHottestMenu?.title.slice(0, 4) ?? '还没有'}
                </Text>
                <Text style={[styles.coupleStatLabel, { color: theme.colors.textSoft }]}>最近偏爱</Text>
              </View>
            </View>
          </View>
        </View>

        {showcaseMenu ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {isPublisher ? '经营视角' : '今日推荐'}
            </Text>
            <View
              style={[
                styles.recommendCard,
                {
                  backgroundColor: panelBackground,
                  borderColor: topBorder,
                  shadowColor: cardShadow,
                },
              ]}
            >
              <View style={styles.recommendMedia}>
                {showcaseMenu.cover_image_url ? (
                  <>
                    <Image source={{ uri: showcaseMenu.cover_image_url }} style={styles.recommendImage} />
                    <View style={styles.recommendOverlay} />
                  </>
                ) : (
                  <View
                    style={[
                      styles.recommendPlaceholder,
                      { backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.2 : 0.36) },
                    ]}
                  >
                    <ChefHat size={32} color={theme.colors.primary} strokeWidth={1.8} />
                  </View>
                )}
                <View style={styles.recommendMediaBottom}>
                  <Text
                    style={[
                      styles.recommendTag,
                      { color: theme.colors.primary, backgroundColor: withAlpha('#ffffff', theme.dark ? 0.16 : 0.8) },
                    ]}
                  >
                    {isPublisher ? '最近热销' : '轻食健康'}
                  </Text>
                  <View
                    style={[styles.favoriteButton, { backgroundColor: withAlpha('#ffffff', theme.dark ? 0.16 : 0.24) }]}
                  >
                    <Heart size={14} color="#ffffff" fill="#ffffff" strokeWidth={2} />
                  </View>
                </View>
              </View>

              <View style={styles.recommendBody}>
                <View style={styles.recommendTextWrap}>
                  <Text style={[styles.recommendTitle, { color: theme.colors.text }]}>{showcaseMenu.title}</Text>
                  <Text style={[styles.recommendDesc, { color: theme.colors.textMuted }]} numberOfLines={2}>
                    {isPublisher
                      ? `${showcaseMenu.completed_order_count} 次完成点单，${pendingOrderCount > 0 ? '今天可能还会继续被点。' : '很适合继续挂在显眼位置。'}`
                      : (showcaseMenu.description ?? '清爽解腻，适合今晚')}
                  </Text>
                </View>

                <Pressable
                  style={[styles.orderButton, { backgroundColor: theme.colors.primaryDeep }]}
                  onPress={handleShowcaseAction}
                >
                  <Text style={styles.orderButtonText}>{isPublisher ? '去看看' : '点单'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        pointerEvents="none"
        style={[
          styles.headerOverlay,
          {
            backgroundColor: theme.dark ? withAlpha(theme.colors.card, 0.88) : 'rgba(255,255,255,0.78)',
            borderBottomColor: withAlpha(theme.colors.cardBorder, 0.72),
            shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.1),
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.brandWrap}>
            <Heart size={14} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2} />
            <Text style={[styles.brandText, { color: theme.colors.primary }]}>LoveMenu</Text>
          </View>
          <Bell size={18} color={theme.colors.primary} strokeWidth={2.2} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 2,
  },
  headerContent: {
    display: 'none',
  },
  welcomeSection: {
    marginTop: 12,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  greetingTitle: {
    marginTop: 4,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.56,
  },
  greetingSubtext: {
    marginTop: 8,
    maxWidth: 260,
    fontSize: 13,
    lineHeight: 20,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusStrip: {
    marginBottom: 20,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusStripText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  overviewCard: {
    flex: 1,
    minHeight: 156,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  overviewGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    borderBottomLeftRadius: 999,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  overviewIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  overviewValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  overviewValue: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
  },
  overviewSuffix: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  overviewHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    marginBottom: 32,
  },
  authorizationCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  authorizationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorizationHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorizationHeroCopy: {
    flex: 1,
  },
  authorizationEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  authorizationTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  authorizationBadgeRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  authorizationBadge: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorizationBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  authorizationMetricRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  authorizationMetricCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  authorizationMetricValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  authorizationMetricLabel: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  authorizationLockedText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 21,
  },
  authorizationLockRow: {
    marginTop: 14,
  },
  authorizationMiniCard: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorizationMiniText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  authorizationButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  authorizationButtonText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  focusCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  focusHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  focusIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusCopy: {
    flex: 1,
  },
  focusEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  focusTitle: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  focusDesc: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
  },
  focusButton: {
    marginTop: 16,
    minHeight: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  focusButtonText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '31%',
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  coupleCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  coupleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coupleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coupleCopy: {
    flex: 1,
  },
  coupleTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  coupleDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  coupleStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  coupleStat: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  coupleStatValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  coupleStatLabel: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  recommendCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  recommendMedia: {
    height: 128,
    position: 'relative',
  },
  recommendImage: {
    width: '100%',
    height: '100%',
  },
  recommendPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  recommendMediaBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  recommendTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendBody: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  recommendTextWrap: {
    flex: 1,
  },
  recommendTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  recommendDesc: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  orderButton: {
    minWidth: 64,
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
