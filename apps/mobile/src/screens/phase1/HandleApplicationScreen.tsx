import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, Clock3, MessageCircle, Quote, UtensilsCrossed } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { MenuRequestEntity } from '../../types/phaseOne';

type Props = NativeStackScreenProps<RootStackParamList, 'HandleApplication'>;

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
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 1) {
    return '刚刚';
  }
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

export function HandleApplicationScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, partnerUser } = useAppStore();
  const [application, setApplication] = useState<MenuRequestEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHandling, setIsHandling] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    void phaseOneApi
      .getMenuRequest(Number(route.params.applicationId))
      .then(({ data }) => {
        if (mounted) {
          setApplication(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setApplication(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [route.params.applicationId]);

  const handleAccept = async () => {
    if (!application || isHandling) {
      return;
    }

    navigation.navigate('MenuForm', {
      sourceRequestId: application.id,
      initialTitle: application.title,
      initialDescription: application.description,
      initialRemark: application.remark,
    });
  };

  const handleReject = async () => {
    if (!application || isHandling) {
      return;
    }

    setIsHandling(true);
    try {
      await phaseOneApi.updateMenuRequestStatus(application.id, {
        status: 'rejected',
        remark: application.remark ?? '这次先不安排',
        create_menu: false,
      });
      dialog.alert('已婉拒', '这份心愿已经标记为已回应。');
      navigation.goBack();
    } catch {
      dialog.alert('处理失败', '只有菜单发布者可以处理心愿，或这份心愿已经被处理。');
    } finally {
      setIsHandling(false);
    }
  };

  const requesterName = application?.consumer_user_id === currentUser?.id ? '我' : (partnerUser?.nickname ?? '宝宝');
  const requestNote = application?.description || application?.remark || '突然好想吃这个，可以安排一下吗？';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="新菜品申请" subtitle="你的小可爱想吃这个" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>正在读取心愿...</Text>
          </View>
        ) : null}

        {!isLoading && !application ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>心愿不存在</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              可能已经被删除，或者你没有权限查看。
            </Text>
          </View>
        ) : null}

        {application ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: withAlpha('#ffffff', 0.86),
                borderColor: withAlpha(theme.colors.primarySoft, 0.3),
                shadowColor: withAlpha(theme.colors.primary, 0.15),
              },
            ]}
          >
            <View style={[styles.blurBlob, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.18) }]} />

            <View style={styles.personRow}>
              <View style={[styles.personAvatarWrap, { borderColor: theme.colors.surface }]}>
                <UtensilsCrossed size={22} color={theme.colors.primary} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={[styles.personName, { color: theme.colors.primary }]}>{requesterName}</Text>
                <Text style={[styles.personTime, { color: theme.colors.textSoft }]}>
                  {formatRequestTime(application.created_at)}
                </Text>
              </View>
            </View>

            <Text style={[styles.dishTitle, { color: theme.colors.text }]}>{application.title}</Text>

            <View style={styles.mediaStack}>
              <View style={[styles.infoBox, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.18) }]}>
                <UtensilsCrossed size={26} color={theme.colors.primary} strokeWidth={2.1} />
                <Text style={[styles.infoBoxTitle, { color: theme.colors.primary }]}>
                  {application.suggested_category_name ?? '还没有推荐分类'}
                </Text>
              </View>

              <View style={[styles.noteCard, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.26) }]}>
                <Quote size={18} color={theme.colors.primarySoft} strokeWidth={2.1} style={styles.noteQuote} />
                <Text style={[styles.noteText, { color: theme.colors.text }]}>“{requestNote}”</Text>
              </View>
            </View>
          </View>
        ) : null}

        {application ? (
          <View style={styles.actionStack}>
            <RomanticGradientButton
              title={isHandling ? '处理中...' : '同意并加入菜单'}
              onPress={handleAccept}
              icon={<CheckCircle2 size={18} color="#ffffff" strokeWidth={2.2} />}
            />

            <View style={styles.secondaryActions}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.7) },
                ]}
                disabled={isHandling}
                onPress={handleReject}
              >
                <Clock3 size={16} color={theme.colors.textMuted} strokeWidth={2.1} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.textMuted }]}>婉拒</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.primarySoft, 0.8) },
                ]}
                onPress={() => navigation.navigate('Chat')}
              >
                <MessageCircle size={16} color={theme.colors.primary} strokeWidth={2.1} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>去聊聊细节</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 36 },
  topCopy: { alignItems: 'center', marginBottom: 24 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 5,
  },
  blurBlob: { position: 'absolute', top: -40, right: -40, width: 128, height: 128, borderRadius: 64 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  personAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  personTime: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
  dishTitle: { fontSize: 22, lineHeight: 28, fontWeight: '600', marginBottom: 16 },
  mediaStack: { gap: 12 },
  infoBox: { minHeight: 112, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10 },
  infoBoxTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  noteCard: { borderRadius: 12, padding: 16, position: 'relative' },
  noteQuote: { position: 'absolute', top: 8, right: 8 },
  noteText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 70 },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  emptyText: { fontSize: 13, lineHeight: 18, fontWeight: '500', textAlign: 'center' },
  actionStack: { gap: 12 },
  secondaryActions: { flexDirection: 'row', gap: 12 },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
});
