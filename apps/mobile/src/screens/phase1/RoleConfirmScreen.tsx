import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Heart, Info, ReceiptText, UtensilsCrossed } from 'lucide-react-native';

import { useAppDialog } from '../../components/AppDialog';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { DateBottomSheetPicker } from '../../components/DateBottomSheetPicker';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleConfirm'>;

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

type RoleChoice = 'publisher' | 'consumer';

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split('-').map((item) => Number(item));
  return new Date(year, month - 1, day);
}

export function RoleConfirmScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, partnerUser, relationship, loadBootstrap } = useAppStore();

  const proposedPublisherUserId = relationship?.proposed_publisher_user_id ?? relationship?.publisher_user_id;
  const initialChoice: RoleChoice = proposedPublisherUserId === currentUser?.id ? 'publisher' : 'consumer';
  const [selectedRole, setSelectedRole] = useState<RoleChoice>(initialChoice);
  const [togetherSince, setTogetherSince] = useState(relationship?.together_since?.slice(0, 10) ?? formatDateValue(new Date()));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!currentUser || !relationship) {
      return;
    }

    if (relationship.role_confirmation_status === 'confirmed') {
      navigation.replace('MainTabs');
    }
  }, [currentUser, navigation, relationship, relationship?.role_confirmation_status]);

  useEffect(() => {
    if (!currentUser || !relationship || relationship.role_confirmation_status === 'confirmed') {
      return undefined;
    }

    const timer = setInterval(() => {
      void loadBootstrap(currentUser.id).catch(() => undefined);
    }, 3000);

    return () => clearInterval(timer);
  }, [currentUser, loadBootstrap, relationship, relationship?.role_confirmation_status]);

  useEffect(() => {
    if (!currentUser || !relationship) {
      return;
    }

    const nextPublisherUserId = relationship.proposed_publisher_user_id ?? relationship.publisher_user_id;
    setSelectedRole(nextPublisherUserId === currentUser.id ? 'publisher' : 'consumer');
  }, [
    currentUser,
    relationship,
    relationship?.proposed_publisher_user_id,
    relationship?.publisher_user_id,
    relationship?.updated_at,
  ]);

  if (!currentUser || !relationship) {
    return null;
  }

  const currentUserName = currentUser.nickname ?? '我';
  const partnerName = partnerUser?.nickname ?? '木头';
  const isPublisher = relationship.publisher_user_id === currentUser.id;
  const currentUserRoleText = selectedRole === 'publisher' ? '主厨' : '食客';
  const partnerRoleText = selectedRole === 'publisher' ? '食客' : '主厨';
  const pageTitle = isPublisher ? '确认你们的角色' : '等待主厨确认';
  const pageSubtitle = isPublisher
    ? '请再次确认双方身份，并填写你们在一起的时间。'
    : `${partnerName} 正在确认角色和纪念日，确认后你会自动进入主页。`;
  const noticeCopy = isPublisher ? '确认后双方会正式进入专属小店' : '你无需操作，保持页面打开即可自动同步';
  const confirmTitle = '确认并进入主页';

  const softBorder = withAlpha(theme.colors.cardBorder, theme.dark ? 0.64 : 0.36);
  const softShadow = withAlpha(theme.colors.primary, theme.dark ? 0.16 : 0.12);
  const panelBackground = theme.dark ? withAlpha(theme.colors.card, 0.96) : theme.colors.surface;
  const bottomBackground = theme.dark
    ? withAlpha(theme.colors.background, 0.96)
    : withAlpha(theme.colors.background, 0.95);

  const handleConfirm = async () => {
    if (!isPublisher) {
      dialog.alert('等待主厨确认', '主厨确认后你会自动进入主页');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(togetherSince.trim())) {
      dialog.alert('请填写日期', '请用 YYYY-MM-DD 格式填写在一起时间');
      return;
    }

    const partnerUserId =
      partnerUser?.id ?? (relationship.user_a_id === currentUser.id ? relationship.user_b_id : relationship.user_a_id);
    const publisherUserId = selectedRole === 'publisher' ? currentUser.id : partnerUserId;
    const consumerUserId = selectedRole === 'publisher' ? partnerUserId : currentUser.id;

    setIsConfirming(true);
    try {
      const { data } = await phaseOneApi.confirmRelationshipRole(
        relationship.id,
        publisherUserId,
        consumerUserId,
        togetherSince.trim(),
      );
      await loadBootstrap(currentUser.id);
      if (data.role_confirmation_status === 'confirmed') {
        navigation.replace('MainTabs');
        return;
      }

      dialog.alert('确认成功', '你们可以进入专属小店啦。');
    } catch {
      dialog.alert('确认失败', '请稍后再试');
    } finally {
      setIsConfirming(false);
    }
  };

  const roleCards = useMemo(
    () => [
      {
        key: 'publisher',
        title: '主厨 (Publisher)',
        body: '负责制定专属菜单，添加拿手好菜，管理小店营业状态。为Ta准备惊喜味道。',
        icon: UtensilsCrossed,
        accent: theme.colors.primary,
        background: withAlpha(theme.colors.primarySoft, theme.dark ? 0.18 : 0.48),
      },
      {
        key: 'consumer',
        title: '食客 (Orderer)',
        body: '拥有浏览菜单的特权，随时下单想吃的美食，享受专属主厨的投喂服务。',
        icon: ReceiptText,
        accent: theme.colors.secondary,
        background: withAlpha(theme.colors.secondarySoft, theme.dark ? 0.2 : 0.52),
      },
    ],
    [theme.colors.primary, theme.colors.primarySoft, theme.colors.secondary, theme.colors.secondarySoft, theme.dark],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 24, paddingBottom: Math.max(insets.bottom + 120, 148) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>{pageTitle}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{pageSubtitle}</Text>
        </View>

        <View
          style={[
            styles.selectorCard,
            {
              backgroundColor: panelBackground,
              borderColor: softBorder,
              shadowColor: softShadow,
            },
          ]}
        >
          <View pointerEvents="none" style={styles.heartBackdrop}>
            <Heart
              size={160}
              color={withAlpha(theme.colors.primary, 0.08)}
              fill={withAlpha(theme.colors.primary, 0.08)}
              strokeWidth={1}
            />
          </View>

          <View style={styles.personRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.85), borderColor: theme.colors.primarySoft },
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{currentUserName.slice(0, 1)}</Text>
            </View>
            <View style={styles.personMeta}>
              <Text style={[styles.personName, { color: theme.colors.text }]}>{currentUserName}</Text>
              <Text style={[styles.personHint, { color: theme.colors.textMuted }]}>将担任 {currentUserRoleText}</Text>
            </View>
            <View
              style={[
                styles.toggleWrap,
                {
                  backgroundColor: theme.dark
                    ? withAlpha(theme.colors.surfaceAlt, 0.88)
                    : withAlpha(theme.colors.surfaceAlt, 0.95),
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: panelBackground,
                    shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.18),
                    transform: [{ translateX: selectedRole === 'publisher' ? 0 : 80 }],
                  },
                ]}
              />
              <Pressable
                disabled={!isPublisher || isConfirming}
                style={styles.toggleButton}
                onPress={() => setSelectedRole('publisher')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    selectedRole === 'publisher'
                      ? { color: theme.colors.primary, fontWeight: '700' }
                      : { color: theme.colors.textSoft },
                  ]}
                >
                  主厨
                </Text>
              </Pressable>
              <Pressable
                disabled={!isPublisher || isConfirming}
                style={styles.toggleButton}
                onPress={() => setSelectedRole('consumer')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    selectedRole === 'consumer'
                      ? { color: theme.colors.primary, fontWeight: '700' }
                      : { color: theme.colors.textSoft },
                  ]}
                >
                  食客
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.56) }]} />
            <View style={[styles.dividerHeart, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.82) }]}>
              <Heart size={14} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2} />
            </View>
            <View style={[styles.dividerLine, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.56) }]} />
          </View>

          <View style={styles.personRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.92),
                  borderColor: withAlpha(theme.colors.cardBorder, 0.84),
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.colors.textMuted }]}>{partnerName.slice(0, 1)}</Text>
            </View>
            <View style={styles.personMeta}>
              <Text style={[styles.personName, { color: theme.colors.text }]}>{partnerName}</Text>
              <Text style={[styles.personHint, { color: theme.colors.textMuted }]}>将担任 {partnerRoleText}</Text>
            </View>
            <View
              style={[
                styles.toggleWrap,
                styles.passiveToggle,
                {
                  backgroundColor: theme.dark
                    ? withAlpha(theme.colors.surfaceAlt, 0.82)
                    : withAlpha(theme.colors.surfaceAlt, 0.92),
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: panelBackground,
                    shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.14 : 0.14),
                    transform: [{ translateX: selectedRole === 'publisher' ? 80 : 0 }],
                  },
                ]}
              />
              <View style={styles.toggleButton}>
                <Text
                  style={[
                    styles.toggleText,
                    partnerRoleText === '主厨'
                      ? { color: theme.colors.primary, fontWeight: '700' }
                      : { color: theme.colors.textSoft },
                  ]}
                >
                  主厨
                </Text>
              </View>
              <View style={styles.toggleButton}>
                <Text
                  style={[
                    styles.toggleText,
                    partnerRoleText === '食客'
                      ? { color: theme.colors.primary, fontWeight: '700' }
                      : { color: theme.colors.textSoft },
                  ]}
                >
                  食客
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoStack}>
          {roleCards.map((role) => {
            const Icon = role.icon;
            return (
              <View
                key={role.key}
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: panelBackground,
                    borderColor: withAlpha(theme.colors.primarySoft, 0.6),
                    shadowColor: softShadow,
                  },
                ]}
              >
                <View style={[styles.infoIconWrap, { backgroundColor: role.background }]}>
                  <Icon size={22} color={role.accent} strokeWidth={2.1} />
                </View>
                <View style={styles.infoCopy}>
                  <Text style={[styles.infoTitle, { color: role.accent }]}>{role.title}</Text>
                  <Text style={[styles.infoBody, { color: theme.colors.textMuted }]}>{role.body}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {isPublisher ? (
          <View style={[styles.dateCard, { backgroundColor: panelBackground, borderColor: softBorder }]}>
            <Text style={[styles.dateLabel, { color: theme.colors.text }]}>在一起时间</Text>
            <Pressable
              disabled={isConfirming}
              style={[styles.dateInput, { borderColor: softBorder }]}
              onPress={() => setDatePickerVisible(true)}
            >
              <Text style={[styles.dateInputText, { color: theme.colors.text }]}>{togetherSince}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.noticeRow}>
          <Info size={14} color={theme.colors.textSoft} strokeWidth={2.2} />
          <Text style={[styles.noticeText, { color: theme.colors.textSoft }]}>{noticeCopy}</Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom + 16, 24),
            backgroundColor: bottomBackground,
          },
        ]}
      >
        {isPublisher ? (
          <RomanticGradientButton
            title={isConfirming ? '确认中...' : confirmTitle}
            disabled={isConfirming}
            onPress={handleConfirm}
            style={{ marginTop: 20 }}
            icon={
              isConfirming ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.3} />
              )
            }
          />
        ) : null}
      </View>

      <DateBottomSheetPicker
        visible={datePickerVisible}
        value={parseDateValue(togetherSince)}
        title="选择在一起时间"
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(date) => setTogetherSince(formatDateValue(date))}
      />
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
    gap: 32,
  },
  headerCopy: {
    marginTop: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.56,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  selectorCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 6,
    overflow: 'hidden',
    gap: 24,
  },
  heartBackdrop: {
    position: 'absolute',
    right: -26,
    top: -24,
    opacity: 1,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
  },
  personMeta: {
    flex: 1,
  },
  personName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  personHint: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
  },
  toggleWrap: {
    width: 164,
    height: 40,
    borderRadius: 999,
    padding: 4,
    flexDirection: 'row',
    position: 'relative',
  },
  passiveToggle: {
    opacity: 0.78,
  },
  toggleThumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 76,
    height: 32,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleButton: {
    width: 78,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerHeart: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoStack: {
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  noticeRow: {
    marginTop: -8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noticeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  dateCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  dateLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  dateInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  confirmButton: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
});
