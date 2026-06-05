import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Soup, Pizza, Drumstick, Coffee, Quote } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillSelector } from '../../components/PillSelector';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { MenuRequestEntity } from '../../types/phaseOne';

type Props = NativeStackScreenProps<RootStackParamList, 'ApplicationList'>;

type ApplicationFilter = 'all' | 'pending' | 'resolved';

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

function formatRequestTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const dayLabel = sameDay
    ? '今天'
    : date.toDateString() === yesterday.toDateString()
      ? '昨天'
      : `${date.getMonth() + 1}/${date.getDate()}`;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dayLabel} ${hours}:${minutes}`;
}

function getRequestIcon(request: MenuRequestEntity) {
  const category = request.suggested_category_name ?? '';
  if (category.includes('饮品')) {
    return Coffee;
  }
  if (category.includes('小食')) {
    return Pizza;
  }
  if (category.includes('主菜')) {
    return Drumstick;
  }
  return Soup;
}

export function ApplicationListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentUser, partnerUser } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<ApplicationFilter>('all');
  const [requests, setRequests] = useState<MenuRequestEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRequests = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { data } = await phaseOneApi.listMenuRequests();
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
    }, [loadRequests]),
  );

  const filtered = requests.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return item.status === 'pending';
    return item.status !== 'pending';
  });

  const pendingCount = requests.filter((item) => item.status === 'pending').length;
  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.4) : theme.colors.cardBorder;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="心愿菜单" subtitle="查收另一半的甜蜜点单申请" onBack={() => navigation.goBack()} />
      <PillSelector
        items={[
          { key: 'all' as const, label: '全部申请' },
          { key: 'pending' as const, label: `待处理 (${pendingCount})` },
          { key: 'resolved' as const, label: '已回应' },
        ]}
        value={activeFilter}
        onChange={setActiveFilter}
        activeBackgroundColor={theme.colors.primary}
        activeBorderColor={theme.colors.primary}
        activeTextColor="#ffffff"
        inactiveBackgroundColor="transparent"
        inactiveBorderColor={withAlpha(theme.colors.cardBorder, 0.6)}
        style={styles.filterTabs}
        contentContainerStyle={styles.filterRow}
        pillStyle={styles.filterPill}
        textStyle={styles.filterPillText}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadRequests(true)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>正在加载心愿...</Text>
          </View>
        ) : null}
        <View style={styles.list}>
          {filtered.map((item) => {
            const Icon = getRequestIcon(item);
            const muted = item.status !== 'pending';
            const requester = item.consumer_user_id === currentUser?.id ? '我' : (partnerUser?.nickname ?? '对方');
            const requesterAvatar =
              item.consumer_user_id === currentUser?.id ? currentUser?.avatar_url : partnerUser?.avatar_url;
            const note = item.description || item.remark || '想吃这个，等你来安排。';
            const canHandle = item.status === 'pending' && item.publisher_user_id === currentUser?.id;

            return (
              <Pressable
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: muted ? withAlpha(theme.colors.cardBorder, 0.4) : borderColor,
                    opacity: item.status === 'rejected' ? 0.78 : 1,
                    shadowColor: withAlpha(theme.colors.primary, muted ? 0.05 : 0.12),
                  },
                ]}
                onPress={
                  canHandle
                    ? () => navigation.navigate('HandleApplication', { applicationId: String(item.id) })
                    : undefined
                }
              >
                {item.status === 'pending' ? (
                  <View style={[styles.cardGlowBar, { backgroundColor: theme.colors.primary }]} />
                ) : null}

                <View style={styles.cardHeader}>
                  <View style={styles.personRow}>
                    <View style={[styles.personAvatarWrap, { borderColor: theme.colors.surface }]}>
                      {requesterAvatar ? <Image source={{ uri: requesterAvatar }} style={styles.personAvatar} /> : null}
                    </View>
                    <View>
                      <Text style={[styles.personName, { color: theme.colors.text }]}>{requester}</Text>
                      <Text style={[styles.personTime, { color: theme.colors.textSoft }]}>
                        {formatRequestTime(item.created_at)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      item.status === 'pending'
                        ? { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.45) }
                        : item.status === 'accepted'
                          ? { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9', borderWidth: 1 }
                          : { backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.9) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === 'pending'
                              ? theme.colors.secondary
                              : item.status === 'accepted'
                                ? '#2E7D32'
                                : theme.colors.textSoft,
                        },
                      ]}
                    >
                      {item.status === 'pending' ? '待处理' : item.status === 'accepted' ? '已加入' : '已婉拒'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.dishTitleRow}>
                    <Icon size={18} color={muted ? theme.colors.textSoft : theme.colors.primary} strokeWidth={2.2} />
                    <Text
                      style={[
                        styles.dishTitle,
                        {
                          color: muted ? theme.colors.textMuted : theme.colors.primary,
                          textDecorationLine: item.status === 'rejected' ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.noteCard,
                      {
                        backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.7),
                        borderColor: withAlpha(theme.colors.cardBorder, 0.5),
                      },
                    ]}
                  >
                    <Quote size={14} color={theme.colors.primarySoft} strokeWidth={2.2} style={styles.quoteIcon} />
                    <Text style={[styles.noteText, { color: theme.colors.textMuted }]}>{note}</Text>
                  </View>
                </View>

                {canHandle ? (
                  <View style={[styles.pendingHintRow, { borderTopColor: withAlpha(theme.colors.cardBorder, 0.45) }]}>
                    <Text style={[styles.pendingHintText, { color: theme.colors.primary }]}>
                      点击卡片去处理这份心愿
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {!isLoading && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>还没有心愿</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>新的点单心愿会出现在这里。</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column', gap: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingRight: 24,
  },
  floatingBackWrap: {
    left: 24,
  },
  floatingBackButton: {
    width: 50,
    height: 50,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  pageHeader: { gap: 4, alignItems: 'flex-end' },
  filterRow: { gap: 10, paddingHorizontal: 24, paddingVertical: 4, alignItems: 'center' },
  filterTabs: { flexGrow: 0, minHeight: 52 },
  filterPill: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  filterPillText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 56 },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  emptyText: { fontSize: 13, lineHeight: 18, fontWeight: '500', textAlign: 'center' },
  list: { gap: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  cardGlowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  personRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  personAvatarWrap: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2 },
  personAvatar: { width: '100%', height: '100%' },
  personName: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  personTime: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  cardBody: { marginBottom: 12, paddingLeft: 52 },
  dishTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dishTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  noteCard: { borderRadius: 12, borderWidth: 1, padding: 12, position: 'relative' },
  quoteIcon: { position: 'absolute', top: -8, left: -8 },
  noteText: { fontSize: 14, lineHeight: 20 },
  pendingHintRow: { marginTop: 6, paddingTop: 14, borderTopWidth: 1 },
  pendingHintText: { fontSize: 12, lineHeight: 16, fontWeight: '600', textAlign: 'right' },
});
