import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BellRing, CalendarClock, Heart, PauseCircle, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { anniversaryApi } from '../../services/anniversaryApi';
import { syncLocalNotificationSchedules } from '../../services/pushNotifications';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { AnniversaryDateRuleType, AnniversaryReminder } from '../../types/anniversary';

type Props = NativeStackScreenProps<RootStackParamList, 'AnniversaryDetail'>;

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

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(date: string | null) {
  if (!date) {
    return '暂未触发';
  }

  const parsedDate = new Date(date);
  return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())} ${pad(
    parsedDate.getHours(),
  )}:${pad(parsedDate.getMinutes())}`;
}

function getTypeLabel(remindType: 'single' | 'repeat' | 'multiple') {
  switch (remindType) {
    case 'single':
      return '单次提醒';
    case 'repeat':
      return '循环提醒';
    case 'multiple':
      return '多次提醒';
    default:
      return remindType;
  }
}

function getPeriodLabel(
  periodType: 'yearly' | 'half_year' | 'quarter' | 'monthly' | 'weekly' | 'custom_days' | null,
  customDays: number | null,
) {
  switch (periodType) {
    case 'yearly':
      return '每年一次';
    case 'half_year':
      return '每半年一次';
    case 'quarter':
      return '每 3 个月一次';
    case 'monthly':
      return '每月一次';
    case 'weekly':
      return '每周一次';
    case 'custom_days':
      return `每 ${customDays ?? 0} 天一次`;
    default:
      return '不重复';
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

function getDateRuleLabel(reminder: AnniversaryReminder) {
  switch (reminder.dateRuleType) {
    case 'fixed_solar':
      return '固定公历日期';
    case 'fixed_lunar':
      return '固定农历日期';
    case 'weekday_of_month':
      return `${reminder.ruleMonth ?? '-'} 月第 ${reminder.ruleWeekOfMonth ?? '-'} 个${getWeekdayLabel(
        reminder.ruleWeekday,
      )}`;
    default:
      return '固定日期';
  }
}

function getWeekdayLabel(weekday: number | null) {
  const labels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekday == null ? '星期几' : (labels[weekday] ?? '星期几');
}

function getCalendarTypeLabel(dateRuleType: AnniversaryDateRuleType | null) {
  switch (dateRuleType) {
    case 'fixed_lunar':
      return '农历';
    case 'weekday_of_month':
      return '规则日期';
    case 'fixed_solar':
    default:
      return '公历';
  }
}

function getAdvanceDaysLabel(days: number) {
  return days === 0 ? '当天提醒' : `提前 ${days} 天提醒`;
}

export function AnniversaryDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const currentUser = useAppStore((state) => state.currentUser);
  const [reminder, setReminder] = useState<AnniversaryReminder | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let mounted = true;
    setLoadError(false);
    void anniversaryApi
      .get(route.params.reminderId)
      .then(({ data }) => {
        if (mounted) {
          setReminder(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentUser, route.params.reminderId]);

  if (!reminder) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SecondaryPageHeader title="纪念日详情" subtitle="" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            {loadError ? '暂时无法查看这个纪念日' : '正在加载纪念日...'}
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {loadError ? '可能是权限不足，或者这条纪念日已经不存在。' : '请稍等一下'}
          </Text>
        </View>
      </View>
    );
  }

  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.38) : theme.colors.cardBorder;
  const softShadow = withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.12);
  const statusLabel = reminder.status === 'active' ? '进行中' : reminder.status === 'paused' ? '已暂停' : '已完成';
  const isCreator = currentUser?.id === reminder.creatorUserId;
  const isTogetherAnniversary = reminder.baseTitle === '在一起纪念日' && reminder.periodType === 'yearly';
  const canEditReminder = isCreator || reminder.permissionType === 'partner_editable';
  const canPause =
    canEditReminder &&
    reminder.status !== 'completed' &&
    (reminder.remindType === 'repeat' || reminder.remindType === 'multiple');
  const canDelete = isCreator && !isTogetherAnniversary;
  const pauseActionLabel = reminder.status === 'paused' ? '恢复提醒' : '暂停提醒';

  const handleDelete = () => {
    if (!canDelete || isDeleting) {
      return;
    }

    dialog.confirm({
      title: '删除纪念日？',
      message: '删除后这条纪念日和提醒记录将不可恢复。',
      actions: [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await anniversaryApi.delete(reminder.id);
              void syncLocalNotificationSchedules(useAppStore.getState().notificationSettings);
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace('Anniversaries', { refreshToken: Date.now() });
              }
            } catch {
              dialog.alert('删除失败', '只有创建者可以删除纪念日，或请稍后再试。');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    });
  };

  const handleTogglePause = async () => {
    if (!canPause || isDeleting) {
      return;
    }

    try {
      const nextStatus = reminder.status === 'paused' ? 'active' : 'paused';
      const { data } = await anniversaryApi.update(reminder.id, { status: nextStatus });
      setReminder(data);
      void syncLocalNotificationSchedules(useAppStore.getState().notificationSettings);
    } catch {
      dialog.alert('操作失败', '请稍后再试');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="纪念日详情" subtitle={reminder.title} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 12) + (canDelete || canPause ? 168 : 108) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor,
              shadowColor: softShadow,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[styles.heroGlowTop, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.42) }]}
          />
          <View
            pointerEvents="none"
            style={[styles.heroGlowBottom, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.5) }]}
          />

          <View style={styles.heroTopRow}>
            <View style={[styles.statusPill, { backgroundColor: theme.colors.primarySoft }]}>
              <Heart size={12} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />
              <Text style={[styles.statusPillText, { color: theme.colors.primary }]}>{statusLabel}</Text>
            </View>
            <Pressable
              style={[styles.editButton, { backgroundColor: theme.colors.surfaceAlt }]}
              onPress={() => navigation.navigate('AnniversaryEditor', { reminderId: reminder.id })}
            >
              <Text style={[styles.editButtonText, { color: theme.colors.text }]}>编辑</Text>
            </Pressable>
          </View>

          <View style={styles.heroBottom}>
            <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{reminder.title}</Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{reminder.description}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor }]}>
            <CalendarClock size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>下次提醒</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{formatDate(reminder.nextTriggerAt)}</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor }]}>
            <BellRing size={18} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>提醒规则</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{getTypeLabel(reminder.remindType)}</Text>
          </View>
        </View>

        <View
          style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor, shadowColor: softShadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>提醒详情</Text>

          <DetailRow
            icon={<CalendarClock size={16} color={theme.colors.primary} strokeWidth={2.2} />}
            label="纪念日时间"
            value={formatDate(reminder.targetDate)}
          />
          <DetailRow
            icon={<CalendarClock size={16} color={theme.colors.primary} strokeWidth={2.2} />}
            label="日期规则"
            value={getDateRuleLabel(reminder)}
          />
          <DetailRow
            icon={<CalendarClock size={16} color={theme.colors.primary} strokeWidth={2.2} />}
            label="日期类型"
            value={getCalendarTypeLabel(reminder.dateRuleType)}
          />
          <DetailRow
            icon={<BellRing size={16} color={theme.colors.primary} strokeWidth={2.2} />}
            label="提前提醒"
            value={getAdvanceDaysLabel(reminder.remindOffsetDays)}
          />
          <DetailRow
            icon={<RotateCcw size={16} color={theme.colors.primary} strokeWidth={2.2} />}
            label="重复周期"
            value={getPeriodLabel(reminder.periodType, reminder.customDays)}
          />
          {reminder.anniversaryYears ? (
            <DetailRow
              icon={<Heart size={16} color={theme.colors.primary} strokeWidth={2.2} />}
              label="周年纪念"
              value={`${reminder.anniversaryYears} 周年`}
            />
          ) : null}
          <DetailRow
            icon={<ShieldCheck size={16} color={theme.colors.primary} strokeWidth={2.2} />}
            label="纪念日权限"
            value={getPermissionLabel(reminder.permissionType)}
            last
          />
        </View>

        <View
          style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor, shadowColor: softShadow }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>触发记录</Text>

          <View style={styles.logRow}>
            <View style={[styles.logIconWrap, { backgroundColor: theme.colors.secondarySoft }]}>
              <BellRing size={15} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.logCopy}>
              <Text style={[styles.logTitle, { color: theme.colors.text }]}>上次提醒</Text>
              <Text style={[styles.logMeta, { color: theme.colors.textMuted }]}>
                {formatDate(reminder.lastTriggerAt)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.38) }]} />

          <View style={styles.logRow}>
            <View style={[styles.logIconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.42) }]}>
              <PauseCircle size={15} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.logCopy}>
              <Text style={[styles.logTitle, { color: theme.colors.text }]}>
                已完成 {reminder.completedTimes} 次{reminder.repeatTimes ? ` / 共 ${reminder.repeatTimes} 次` : ''}
              </Text>
              <Text style={[styles.logMeta, { color: theme.colors.textMuted }]}>创建人：{reminder.createdBy}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 14,
            backgroundColor: withAlpha(theme.colors.background, 0.96),
          },
        ]}
      >
        {canPause ? (
          <Pressable
            style={({ pressed }) => [
              styles.pauseButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: withAlpha(theme.colors.cardBorder, 0.68),
                opacity: pressed ? 0.78 : 1,
              },
            ]}
            onPress={handleTogglePause}
          >
            {reminder.status === 'paused' ? (
              <RotateCcw size={17} color={theme.colors.primary} strokeWidth={2.2} />
            ) : (
              <PauseCircle size={17} color={theme.colors.primary} strokeWidth={2.2} />
            )}
            <Text style={[styles.pauseButtonText, { color: theme.colors.primary }]}>{pauseActionLabel}</Text>
          </Pressable>
        ) : null}
        {canDelete ? (
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: withAlpha(theme.colors.danger, theme.dark ? 0.18 : 0.09),
                borderColor: withAlpha(theme.colors.danger, 0.22),
                opacity: pressed || isDeleting ? 0.72 : 1,
              },
            ]}
            disabled={isDeleting}
            onPress={handleDelete}
          >
            <Trash2 size={17} color={theme.colors.danger} strokeWidth={2.2} />
            <Text style={[styles.deleteButtonText, { color: theme.colors.danger }]}>
              {isDeleting ? '删除中...' : '删除纪念日'}
            </Text>
          </Pressable>
        ) : null}
        <RomanticGradientButton
          title="编辑提醒"
          onPress={() => navigation.navigate('AnniversaryEditor', { reminderId: reminder.id })}
        />
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value, last }: { icon: ReactNode; label: string; value: string; last?: boolean }) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.detailRow,
        !last ? { borderBottomWidth: 1, borderBottomColor: withAlpha(theme.colors.cardBorder, 0.28) } : null,
      ]}
    >
      <View style={styles.detailLeft}>
        <View style={[styles.detailIconWrap, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.8) }]}>
          {icon}
        </View>
        <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
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
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 220,
    padding: 20,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 8,
  },
  heroGlowTop: {
    position: 'absolute',
    top: -50,
    right: -34,
    width: 170,
    height: 170,
    borderRadius: 999,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -64,
    left: -50,
    width: 190,
    height: 190,
    borderRadius: 999,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPillText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  editButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  heroBottom: {
    marginTop: 'auto',
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.56,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 14,
  },
  detailRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  detailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logCopy: {
    flex: 1,
    gap: 4,
  },
  logTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  logMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  deleteButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  pauseButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pauseButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
