import { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, Clock3, Heart, NotebookPen, PackageCheck, ReceiptText, XCircle } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDialog } from '../../components/AppDialog';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { OrderEntity } from '../../types/phaseOne';
import { useAppTheme } from '../../theme/useAppTheme';
import { formatDateTime } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

type TimelineItem = {
  key: string;
  label: string;
  description: string;
  time: string | null;
  done: boolean;
  icon: typeof Clock3;
};

type OrderFeedbackPreview = {
  rating: number;
  note: string;
  imageUrls: string[];
  createdAt: string;
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
      return '未知状态';
  }
}

function getStatusHint(status: OrderEntity['status'], isPublisher: boolean) {
  switch (status) {
    case 'pending':
      return isPublisher ? '对方提交了点单，等你决定是否接下。' : '你的点单已经送达，正在等待对方处理。';
    case 'accepted':
      return isPublisher ? '你已经接下这份订单，完成后可以确认交付。' : '对方已经接单，正在准备这份心意。';
    case 'completed':
      return isPublisher ? '你已经完成这份订单，可以等待对方反馈。' : '这份订单已经完成，可以补一条甜蜜反馈。';
    case 'rejected':
      return isPublisher ? '你已经婉拒了这份订单，记录会保留。' : '这份订单暂时没有被接受，可以之后再换一个。';
    case 'cancelled':
      return isPublisher ? '对方已经取消这份订单，无需继续处理。' : '你已经取消这份订单，历史记录仍会保留。';
    default:
      return '订单状态已更新。';
  }
}

function getTimeline(order: OrderEntity, isPublisher: boolean): TimelineItem[] {
  return [
    {
      key: 'created',
      label: isPublisher ? '收到点单' : '提交点单',
      description: isPublisher ? '购买方发起了这份订单' : '你向对方发起了这份订单',
      time: order.created_at,
      done: true,
      icon: ReceiptText,
    },
    {
      key: 'accepted',
      label:
        order.status === 'rejected' ? (isPublisher ? '已婉拒' : '对方婉拒') : isPublisher ? '你已接单' : '对方接单',
      description:
        order.status === 'rejected'
          ? isPublisher
            ? '你暂时无法处理这份订单'
            : '对方暂时无法处理这份订单'
          : isPublisher
            ? '订单进入准备阶段'
            : '可以等待对方完成',
      time: order.rejected_at ?? order.accepted_at,
      done: Boolean(order.accepted_at || order.rejected_at),
      icon: order.status === 'rejected' ? XCircle : PackageCheck,
    },
    {
      key: 'completed',
      label:
        order.status === 'cancelled' ? (isPublisher ? '对方取消' : '你已取消') : isPublisher ? '确认完成' : '订单完成',
      description:
        order.status === 'cancelled'
          ? isPublisher
            ? '购买方取消了这次点单'
            : '这次点单已经取消'
          : isPublisher
            ? '完成后由你确认订单交付'
            : '完成后可以记录反馈',
      time: order.cancelled_at ?? order.completed_at,
      done: Boolean(order.completed_at || order.cancelled_at),
      icon: order.status === 'cancelled' ? XCircle : CheckCircle2,
    },
  ];
}

export function OrderDetailScreen({ route, navigation }: Props) {
  const dialog = useAppDialog();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentUser, partnerUser, orders, menus, previewRole, loadBootstrap } = useAppStore();
  const order = orders.find((item) => item.id === route.params.orderId);
  const menu = menus.find((item) => item.id === order?.menu_id);
  const orderItems = order?.items?.length
    ? order.items
    : order && menu
      ? [
          {
            id: order.id,
            order_id: order.id,
            menu_id: menu.id,
            title_snapshot: menu.title,
            cover_image_url_snapshot: menu.cover_image_url,
            quantity: 1,
            deducted_count: order.deducted_count,
            sort_order: 0,
            created_at: order.created_at,
          },
        ]
      : [];

  if (!order || !currentUser) {
    return null;
  }

  const isPublisher = previewRole === 'publisher';
  const partnerName = partnerUser?.nickname ?? '对方';
  const publisherName = order.publisher_user_id === currentUser.id ? currentUser.nickname : partnerName;
  const consumerName = order.consumer_user_id === currentUser.id ? currentUser.nickname : partnerName;
  const remarkLabel = isPublisher ? '购买方备注' : '我的备注';
  const statusText = getStatusCopy(order.status);
  const timeline = getTimeline(order, isPublisher);
  const feedback = null as OrderFeedbackPreview | null;
  const actionItems: Array<{
    key: string;
    title: string;
    icon: ReactNode;
    variant?: 'primary' | 'soft';
    onPress: () => void;
  }> = [];
  const subtitleColor = theme.dark ? theme.colors.textMuted : '#6f7388';
  const panelBorder = theme.dark ? withAlpha(theme.colors.cardBorder, 0.45) : theme.colors.cardBorder;
  const statusColor =
    order.status === 'completed'
      ? theme.colors.success
      : order.status === 'accepted'
        ? theme.colors.primary
        : order.status === 'pending'
          ? theme.colors.secondary
          : order.status === 'rejected'
            ? theme.colors.danger
            : theme.colors.textSoft;

  const handleStatus = async (status: typeof order.status, remark: string) => {
    await phaseOneApi.updateOrderStatus(order.id, status, remark);
    await loadBootstrap();
    dialog.alert('更新成功', `订单状态已更新为${getStatusCopy(status)}`);
    navigation.goBack();
  };

  if (isPublisher && order.status === 'pending') {
    actionItems.push(
      {
        key: 'accept',
        title: '接受并开始准备',
        icon: <PackageCheck size={18} color="#ffffff" strokeWidth={2.3} />,
        onPress: () => handleStatus('accepted', '已接单'),
      },
      {
        key: 'reject',
        title: '暂时婉拒',
        variant: 'soft',
        icon: <XCircle size={18} color={theme.colors.primary} strokeWidth={2.3} />,
        onPress: () => handleStatus('rejected', '暂时无法处理'),
      },
    );
  }

  if (isPublisher && order.status === 'accepted') {
    actionItems.push({
      key: 'complete',
      title: '确认已完成',
      icon: <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.3} />,
      onPress: () => handleStatus('completed', '已完成'),
    });
  }

  if (!isPublisher && (order.status === 'pending' || order.status === 'accepted')) {
    actionItems.push({
      key: 'cancel',
      title: '取消我的点单',
      variant: 'soft',
      icon: <XCircle size={18} color={theme.colors.primary} strokeWidth={2.3} />,
      onPress: () => handleStatus('cancelled', '我先取消啦'),
    });
  }

  if (!isPublisher && order.status === 'completed') {
    actionItems.push({
      key: 'feedback',
      title: '去写反馈',
      icon: <NotebookPen size={18} color="#ffffff" strokeWidth={2.3} />,
      onPress: () => navigation.navigate('OrderFeedback', { orderId: order.id }),
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader
        title="订单详情"
        subtitle={isPublisher ? '处理对方发来的点单' : '查看我的点单进度'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (actionItems.length > 0 ? 124 : 32) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary }]}>
            <Heart size={22} color="#ffffff" fill="#ffffff" strokeWidth={2.2} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.menuTitle, { color: theme.colors.text }]}>
              {orderItems.length > 1
                ? `${orderItems.length} 个菜品`
                : (orderItems[0]?.title_snapshot ?? menu?.title ?? `菜单 ${order.menu_id}`)}
            </Text>
            <Text style={[styles.orderNumber, { color: subtitleColor }]} selectable>
              订单号 {order.order_no}
            </Text>
            <Text style={[styles.statusHint, { color: subtitleColor }]}>
              {getStatusHint(order.status, isPublisher)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: withAlpha(statusColor, 0.13), borderColor: withAlpha(statusColor, 0.26) },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {isPublisher && order.status === 'completed' ? (
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder }]}>
            <View style={styles.sectionTitleRow}>
              <Heart size={18} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>购买方反馈</Text>
            </View>
            {feedback ? (
              <View
                style={[
                  styles.feedbackBox,
                  { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.32) },
                ]}
              >
                <View style={styles.feedbackRatingRow}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Heart
                      key={index}
                      size={18}
                      color={index < feedback.rating ? theme.colors.primary : withAlpha(theme.colors.cardBorder, 0.8)}
                      fill={index < feedback.rating ? theme.colors.primary : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                  <Text style={[styles.feedbackRatingText, { color: theme.colors.primary }]}>{feedback.rating}/5</Text>
                </View>
                <Text style={[styles.feedbackNote, { color: theme.colors.text }]}>{feedback.note}</Text>
                {feedback.imageUrls.length > 0 ? (
                  <View style={styles.feedbackImageGrid}>
                    {feedback.imageUrls.map((imageUrl) => (
                      <Image key={imageUrl} source={{ uri: imageUrl }} style={styles.feedbackImage} />
                    ))}
                  </View>
                ) : null}
                <Text style={[styles.feedbackTime, { color: subtitleColor }]} selectable>
                  {formatDateTime(feedback.createdAt)}
                </Text>
              </View>
            ) : (
              <View style={[styles.feedbackEmpty, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={[styles.feedbackEmptyText, { color: subtitleColor }]}>暂无反馈</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder }]}>
          <View style={styles.sectionTitleRow}>
            <Clock3 size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {isPublisher ? '处理进度' : '点单进度'}
            </Text>
          </View>
          <View style={styles.timeline}>
            {timeline.map((item, index) => {
              const Icon = item.icon;
              const itemColor = item.done ? statusColor : theme.colors.textSoft;
              return (
                <View key={item.key} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: item.done ? withAlpha(itemColor, 0.14) : theme.colors.surfaceAlt,
                          borderColor: item.done
                            ? withAlpha(itemColor, 0.34)
                            : withAlpha(theme.colors.cardBorder, 0.55),
                        },
                      ]}
                    >
                      <Icon size={15} color={itemColor} strokeWidth={2.2} />
                    </View>
                    {index < timeline.length - 1 ? (
                      <View
                        style={[styles.timelineLine, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.55) }]}
                      />
                    ) : null}
                  </View>
                  <View style={[styles.timelineCopy, { borderBottomColor: withAlpha(theme.colors.cardBorder, 0.32) }]}>
                    <Text
                      style={[styles.timelineLabel, { color: item.done ? theme.colors.text : theme.colors.textSoft }]}
                    >
                      {item.label}
                    </Text>
                    <Text style={[styles.timelineDescription, { color: subtitleColor }]}>{item.description}</Text>
                    <Text style={[styles.timelineTime, { color: subtitleColor }]} selectable={item.done}>
                      {item.done ? formatDateTime(item.time) : '等待更新'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder }]}>
          <View style={styles.sectionTitleRow}>
            <NotebookPen size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>订单信息</Text>
          </View>
          <View style={styles.detailGrid}>
            <DetailItem
              label="菜单内容"
              value={
                orderItems.length > 0
                  ? orderItems.map((item) => item.title_snapshot).join('、')
                  : (menu?.title ?? `菜单 ${order.menu_id}`)
              }
            />
            <DetailItem label={isPublisher ? '扣减次数' : '点单数量'} value={`${order.deducted_count} 次`} />
            <DetailItem label="发布方" value={publisherName} />
            <DetailItem label="购买方" value={consumerName} />
            <DetailItem label="创建时间" value={formatDateTime(order.created_at)} />
            <DetailItem label="更新时间" value={formatDateTime(order.updated_at)} />
          </View>
          <View
            style={[
              styles.remarkBox,
              { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.32) },
            ]}
          >
            <Text style={[styles.remarkLabel, { color: theme.colors.textSoft }]}>{remarkLabel}</Text>
            <Text style={[styles.remarkText, { color: theme.colors.text }]}>
              {order.user_remark ?? '这一单没有备注内容。'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {actionItems.length > 0 ? (
        <View
          style={[
            styles.fixedActionBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: theme.colors.background,
              borderTopColor: withAlpha(theme.colors.cardBorder, 0.45),
            },
          ]}
        >
          <View style={styles.actionList}>
            {actionItems.map((item) => (
              <OrderActionButton
                key={item.key}
                title={item.title}
                icon={item.icon}
                variant={item.variant}
                onPress={item.onPress}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  function DetailItem({ label, value }: { label: string; value: string }) {
    return (
      <View
        style={[
          styles.detailItem,
          { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.28) },
        ]}
      >
        <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: theme.colors.text }]} selectable>
          {value}
        </Text>
      </View>
    );
  }

  function OrderActionButton({
    title,
    icon,
    onPress,
    variant = 'primary',
  }: {
    title: string;
    icon: ReactNode;
    onPress: () => void;
    variant?: 'primary' | 'soft';
  }) {
    const isPrimary = variant === 'primary';
    const gradientId = isPrimary ? 'order-action-primary' : 'order-action-soft';
    const startColor = isPrimary ? theme.colors.primary : withAlpha(theme.colors.primarySoft, 0.72);
    const middleColor = isPrimary ? theme.colors.primaryDeep : theme.colors.surface;
    const endColor = isPrimary
      ? withAlpha(theme.colors.primaryDeep, 0.92)
      : withAlpha(theme.colors.secondarySoft, 0.82);

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.orderActionButton,
          {
            borderColor: isPrimary
              ? withAlpha(theme.colors.primaryDeep, 0.2)
              : withAlpha(theme.colors.primarySoft, 0.85),
            shadowColor: withAlpha(theme.colors.primary, isPrimary ? 0.26 : 0.12),
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <View pointerEvents="none" style={styles.orderActionGradientLayer}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={startColor} />
                <Stop offset="0.58" stopColor={middleColor} />
                <Stop offset="1" stopColor={endColor} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
          </Svg>
        </View>
        <View
          style={[
            styles.orderActionIcon,
            { backgroundColor: isPrimary ? 'rgba(255,255,255,0.2)' : withAlpha(theme.colors.primarySoft, 0.82) },
          ]}
        >
          {icon}
        </View>
        <Text style={[styles.orderActionText, { color: isPrimary ? '#ffffff' : theme.colors.text }]}>{title}</Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  visualSwitchCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  visualSwitchTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  visualSwitchHint: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  visualSegment: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    gap: 3,
  },
  visualSegmentButton: {
    minWidth: 58,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  visualSegmentText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 5,
  },
  menuTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  orderNumber: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  statusHint: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    width: 34,
    alignItems: 'center',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 1,
    minHeight: 28,
  },
  timelineCopy: {
    flex: 1,
    borderBottomWidth: 1,
    paddingBottom: 14,
    marginBottom: 12,
  },
  timelineLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  timelineDescription: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  timelineTime: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    width: '48%',
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  remarkBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  remarkLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  remarkText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  feedbackBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  feedbackRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  feedbackRatingText: {
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  feedbackNote: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  feedbackImageGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
  },
  feedbackTime: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  feedbackEmpty: {
    borderRadius: 14,
    padding: 14,
  },
  feedbackEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  fixedActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 8,
  },
  actionList: {
    gap: 10,
  },
  previewNotice: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  orderActionButton: {
    height: 58,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
  },
  orderActionGradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  orderActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderActionText: {
    flex: 1,
    textAlign: 'center',
    marginRight: 46,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
});
