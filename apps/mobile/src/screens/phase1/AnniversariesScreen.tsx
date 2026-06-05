import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BellRing, CalendarClock, ChevronRight, Heart, PauseCircle, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { PillSelector } from '../../components/PillSelector';
import { RoundIconAction } from '../../components/RoundIconAction';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { anniversaryApi } from '../../services/anniversaryApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { AnniversaryReminder, AnniversaryStatus } from '../../types/anniversary';

type Props = NativeStackScreenProps<RootStackParamList, 'Anniversaries'>;
type ReminderFilter = 'all' | AnniversaryStatus;

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

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

function getStatusLabel(status: AnniversaryStatus) {
  switch (status) {
    case 'active':
      return '进行中';
    case 'paused':
      return '已暂停';
    case 'completed':
      return '已完成';
    default:
      return status;
  }
}

function getPermissionLabel(permissionType: 'private' | 'partner_visible' | 'partner_editable') {
  switch (permissionType) {
    case 'private':
      return '仅自己可见';
    case 'partner_visible':
      return '对方可见';
    case 'partner_editable':
      return '对方可编辑';
    default:
      return permissionType;
  }
}

function getReminderMetaLabel(item: AnniversaryReminder, currentUserId: number | undefined) {
  if (currentUserId && item.creatorUserId !== currentUserId) {
    return '对方创建';
  }

  return getPermissionLabel(item.permissionType);
}

export function AnniversariesScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const relationship = useAppStore((state) => state.relationship);
  const currentUser = useAppStore((state) => state.currentUser);
  const [activeFilter, setActiveFilter] = useState<ReminderFilter>('all');
  const [anniversaryReminders, setAnniversaryReminders] = useState<AnniversaryReminder[]>([]);
  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.36) : theme.colors.cardBorder;

  const refreshAnniversaries = useCallback(async () => {
    if (!relationship || !currentUser) {
      setAnniversaryReminders([]);
      return;
    }

    const { data } = await anniversaryApi.list();
    setAnniversaryReminders(data);
  }, [currentUser, relationship]);

  useFocusEffect(
    useCallback(() => {
      void refreshAnniversaries();
    }, [refreshAnniversaries]),
  );

  useEffect(() => {
    void refreshAnniversaries();
  }, [refreshAnniversaries, route.params?.refreshToken]);

  const filteredReminders = useMemo(
    () =>
      activeFilter === 'all'
        ? anniversaryReminders
        : anniversaryReminders.filter((item) => item.status === activeFilter),
    [activeFilter, anniversaryReminders],
  );
  const featuredReminder = anniversaryReminders.find((item) => item.status === 'active') ?? anniversaryReminders[0];
  const activeCount = anniversaryReminders.filter((item) => item.status === 'active').length;
  const pausedCount = anniversaryReminders.filter((item) => item.status === 'paused').length;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="我们的纪念日" subtitle="留住每一个闪耀的瞬间" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 120, 148) }]}
        showsVerticalScrollIndicator={false}
      >
        {featuredReminder ? (
          <Pressable
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor,
                shadowColor: withAlpha(theme.colors.primary, 0.18),
              },
            ]}
            onPress={() => navigation.navigate('AnniversaryDetail', { reminderId: featuredReminder.id })}
          >
            <View
              pointerEvents="none"
              style={[styles.heroGlowTop, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.32) }]}
            />
            <View
              pointerEvents="none"
              style={[styles.heroGlowBottom, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.38) }]}
            />

            <View style={styles.heroTop}>
              <View>
                <View
                  style={[
                    styles.oncePill,
                    { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.5), borderColor },
                  ]}
                >
                  <Heart size={12} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />
                  <Text style={[styles.oncePillText, { color: theme.colors.primary }]}>
                    {getStatusLabel(featuredReminder.status)}
                  </Text>
                </View>
                <Text style={[styles.heroEventTitle, { color: theme.colors.text }]}>{featuredReminder.title}</Text>
                <Text style={[styles.heroEventDate, { color: theme.colors.textMuted }]}>
                  {formatShortDate(featuredReminder.targetDate)}
                </Text>
              </View>
              <View style={[styles.heroIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                <CalendarClock size={20} color={theme.colors.primary} strokeWidth={2.2} />
              </View>
            </View>

            <View style={[styles.countdownRow, { borderTopColor: withAlpha(theme.colors.cardBorder, 0.3) }]}>
              <Text style={[styles.countdownLabel, { color: theme.colors.textMuted }]}>当前进行中的提醒</Text>
              <View style={styles.countdownValueRow}>
                <Text style={[styles.countdownValue, { color: theme.colors.primary }]}>{activeCount}</Text>
                <Text style={[styles.countdownUnit, { color: theme.colors.primary }]}>条</Text>
              </View>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor }]}>
            <BellRing size={18} color={theme.colors.primary} strokeWidth={2.1} />
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{activeCount}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>正在提醒</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor }]}>
            <PauseCircle size={18} color={theme.colors.primary} strokeWidth={2.1} />
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{pausedCount}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>暂时暂停</Text>
          </View>
        </View>

        <PillSelector
          items={[
            { key: 'all' as const, label: '全部提醒' },
            { key: 'active' as const, label: '进行中' },
            { key: 'paused' as const, label: '已暂停' },
            { key: 'completed' as const, label: '已完成' },
          ]}
          value={activeFilter}
          onChange={setActiveFilter}
          inactiveBackgroundColor={withAlpha(theme.colors.surfaceAlt, 0.92)}
          activeBorderColor={withAlpha(theme.colors.primarySoft, 0.68)}
          activeTextColor={theme.colors.badgeText}
          style={styles.filterTabs}
          contentContainerStyle={styles.filterRow}
          pillStyle={{ paddingHorizontal: 14, paddingVertical: 8 }}
          textStyle={{ fontSize: 12, lineHeight: 16, fontWeight: '600' }}
        />

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.colors.text }]}>提醒列表</Text>
          <Pressable style={styles.viewAllButton} onPress={() => navigation.navigate('AnniversaryEditor')}>
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>新建提醒</Text>
            <ChevronRight size={14} color={theme.colors.primary} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {filteredReminders.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate('AnniversaryDetail', { reminderId: item.id })}
              style={[
                styles.listCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: item.status === 'completed' ? withAlpha(theme.colors.cardBorder, 0.32) : borderColor,
                  opacity: item.status === 'completed' ? 0.78 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.listIconWrap,
                  {
                    backgroundColor:
                      item.status === 'active'
                        ? theme.colors.primarySoft
                        : item.status === 'paused'
                          ? withAlpha(theme.colors.secondary, 0.18)
                          : withAlpha(theme.colors.surfaceAlt, 0.92),
                  },
                ]}
              >
                <CalendarClock
                  size={20}
                  color={item.status === 'completed' ? theme.colors.textMuted : theme.colors.primary}
                  strokeWidth={2.1}
                />
              </View>
              <View style={styles.listCopy}>
                <Text style={[styles.listItemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.listMetaRow}>
                  <Text style={[styles.listMeta, { color: theme.colors.textMuted }]}>
                    {formatShortDate(item.targetDate)}
                  </Text>
                  <View style={[styles.dot, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.9) }]} />
                  <Text style={[styles.listMeta, { color: theme.colors.secondary }]}>
                    {getReminderMetaLabel(item, currentUser?.id)}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.dayBadge,
                  {
                    backgroundColor:
                      item.status === 'active' ? theme.colors.secondarySoft : withAlpha(theme.colors.surfaceAlt, 0.9),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayBadgeText,
                    { color: item.status === 'active' ? theme.colors.primary : theme.colors.textMuted },
                  ]}
                >
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <RoundIconAction
        floating
        icon={<Plus size={22} color="#ffffff" strokeWidth={2.4} />}
        onPress={() => navigation.navigate('AnniversaryEditor')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 24,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  heroGlowTop: {
    position: 'absolute',
    top: -40,
    right: -28,
    width: 160,
    height: 160,
    borderRadius: 999,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -32,
    left: -12,
    width: 140,
    height: 140,
    borderRadius: 999,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  oncePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  oncePillText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  heroEventTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.48,
  },
  heroEventDate: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownRow: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdownLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  countdownValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  countdownValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  countdownUnit: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  summaryValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  filterRow: {
    gap: 10,
    paddingBottom: 8,
  },
  filterTabs: {
    flexGrow: 0,
  },
  listHeader: {
    marginTop: 6,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  list: {
    gap: 14,
  },
  listCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  listIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCopy: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  listMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dayBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
