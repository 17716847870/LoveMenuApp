import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays, CheckCheck, Clock3, NotebookPen } from 'lucide-react-native';

import { PageHeaderBlock } from '../../components/PageHeaderBlock';
import { PillSelector } from '../../components/PillSelector';
import { RootStackParamList, RootTabParamList } from '../../navigation/AppNavigator';
import { useAppStore } from '../../store/appStore';
import { OrderEntity } from '../../types/phaseOne';
import { useAppTheme } from '../../theme/useAppTheme';
import { formatDateTime } from '../../utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Orders'>,
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

type OrderFilter = 'all' | OrderEntity['status'];

const FILTERS: Array<{ key: OrderFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'accepted', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

function getStatusCopy(status: OrderEntity['status']) {
  switch (status) {
    case 'pending':
      return '待处理';
    case 'accepted':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'rejected':
      return '已拒绝';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
}

export function OrdersScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const { orders, menus, previewRole, currentUser, relationship, loadBootstrap } = useAppStore();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageOffset = useRef(new Animated.Value(0)).current;

  const refreshOrders = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadBootstrap();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBootstrap]);

  useEffect(() => {
    Animated.spring(pageOffset, {
      toValue: isRefreshing ? 28 : 0,
      useNativeDriver: true,
      tension: 90,
      friction: 12,
    }).start();
  }, [isRefreshing, pageOffset]);

  useFocusEffect(
    useCallback(() => {
      void loadBootstrap().catch(() => undefined);
    }, [loadBootstrap]),
  );

  const visibleOrders = useMemo(() => {
    if (!currentUser || !relationship) {
      return [];
    }

    return orders.filter((order) => {
      if (previewRole === 'publisher') {
        return order.publisher_user_id === relationship.publisher_user_id;
      }

      return order.consumer_user_id === relationship.consumer_user_id;
    });
  }, [currentUser, orders, previewRole, relationship]);

  const filteredOrders = useMemo(
    () => (activeFilter === 'all' ? visibleOrders : visibleOrders.filter((order) => order.status === activeFilter)),
    [activeFilter, visibleOrders],
  );

  const subtitleColor = theme.dark ? theme.colors.textMuted : '#6f7388';
  const panelBorder = theme.dark ? withAlpha(theme.colors.cardBorder, 0.4) : theme.colors.cardBorder;
  const panelShadow = withAlpha(theme.colors.primary, theme.dark ? 0.16 : 0.08);
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.pageContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshOrders}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <Animated.View style={{ transform: [{ translateY: pageOffset }] }}>
          <PageHeaderBlock
            title="订单"
            subtitle="回顾那些甜蜜的共享时光"
            titleColor={theme.colors.primary}
            subtitleColor={theme.colors.textSoft}
            style={styles.pageHeader}
          />
          <PillSelector
            items={FILTERS}
            value={activeFilter}
            onChange={setActiveFilter}
            inactiveBackgroundColor={withAlpha(theme.colors.surfaceAlt, 0.9)}
            activeBorderColor={withAlpha(theme.colors.primarySoft, 0.6)}
            inactiveTextColor={subtitleColor}
            style={styles.filterTabs}
            contentContainerStyle={styles.filterRow}
            pillStyle={styles.filterPill}
            textStyle={styles.filterPillText}
          />
          <View style={styles.content}>
            <View style={styles.orderList}>
              {filteredOrders.map((order) => {
                const menu = menus.find((item) => item.id === order.menu_id);
                const orderTitle =
                  order.items && order.items.length > 1
                    ? `${order.items[0].title_snapshot} 等 ${order.items.length} 个菜品`
                    : (order.items?.[0]?.title_snapshot ?? menu?.title ?? `菜单 ${order.menu_id}`);
                const statusText = getStatusCopy(order.status);
                const accent =
                  order.status === 'accepted'
                    ? theme.colors.primarySoft
                    : order.status === 'pending'
                      ? theme.colors.secondarySoft
                      : order.status === 'completed'
                        ? withAlpha(theme.colors.secondary, 0.25)
                        : withAlpha(theme.colors.surfaceAlt, 0.86);
                const sideBar =
                  order.status === 'accepted'
                    ? theme.colors.primary
                    : order.status === 'pending'
                      ? theme.colors.secondary
                      : order.status === 'completed'
                        ? theme.colors.accent
                        : theme.colors.textSoft;

                return (
                  <Pressable
                    key={order.id}
                    style={[
                      styles.orderCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: panelBorder,
                        shadowColor: panelShadow,
                        opacity: order.status === 'cancelled' ? 0.72 : order.status === 'rejected' ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
                  >
                    <View style={[styles.cardAccent, { backgroundColor: sideBar }]} />

                    <View style={styles.orderHeader}>
                      <View style={styles.headerCopy}>
                        <Text style={[styles.orderTitle, { color: theme.colors.text }]}>{orderTitle}</Text>
                        <View style={styles.orderMetaRow}>
                          <Clock3 size={14} color={subtitleColor} strokeWidth={2.1} />
                          <Text style={[styles.orderMetaText, { color: subtitleColor }]}>
                            {formatDateTime(order.created_at)}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[styles.statusBadge, { backgroundColor: accent, borderColor: withAlpha(sideBar, 0.25) }]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: order.status === 'completed' ? theme.colors.text : sideBar },
                          ]}
                        >
                          {statusText}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.55) }]} />

                    <View
                      style={[
                        styles.noteCard,
                        {
                          backgroundColor:
                            order.status === 'completed' ? 'transparent' : withAlpha(theme.colors.surfaceAlt, 0.65),
                          borderColor:
                            order.status === 'completed' ? 'transparent' : withAlpha(theme.colors.cardBorder, 0.25),
                        },
                      ]}
                    >
                      {order.status === 'completed' ? (
                        <CheckCheck size={18} color={subtitleColor} strokeWidth={2.1} />
                      ) : (
                        <NotebookPen size={18} color={subtitleColor} strokeWidth={2.1} />
                      )}
                      <Text style={[styles.noteText, { color: subtitleColor }]}>
                        {order.status === 'completed'
                          ? '订单已顺利完成，期待您的再次光临。'
                          : (order.user_remark ?? '这一单没有备注内容。')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {filteredOrders.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: panelBorder }]}>
                  <CalendarDays size={18} color={subtitleColor} strokeWidth={2.2} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>这个筛选下还没有订单</Text>
                  <Text style={[styles.emptyText, { color: subtitleColor }]}>
                    换个筛选看看，或者先去菜单页发起一单。
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  pageHeader: {
    marginLeft: 24,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
    marginTop: 8,
  },
  filterRow: {
    gap: 12,
    paddingVertical: 4,
  },
  filterTabs: {
    flexGrow: 0,
    marginHorizontal: 16,
  },
  filterPill: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  filterPillText: {
    fontSize: 14,
    lineHeight: 20,
  },
  orderList: {
    gap: 16,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  orderTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderMetaText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  noteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
