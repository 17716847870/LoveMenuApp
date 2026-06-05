import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, Heart, KeyRound, Send, Ticket } from 'lucide-react-native';

import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { routeForNextStep } from '../../utils/onboarding';

type Props = NativeStackScreenProps<RootStackParamList, 'Bind'>;

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

export function BindScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, partnerUser, relationship, coupleInvites, loadBootstrap, resetPreferredRole } = useAppStore();
  const [inviteCode, setInviteCode] = useState('');
  const [localInviteCode, setLocalInviteCode] = useState<string | null>(null);
  const [isResettingRole, setIsResettingRole] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isBinding, setIsBinding] = useState(false);

  const isBound = relationship?.status === 'active';
  const isRoleConfirmed = relationship?.role_confirmation_status === 'confirmed';
  const isPublisher = currentUser?.preferred_role === 'publisher';
  const isConsumer = currentUser?.preferred_role === 'consumer';
  const pendingInviteCode = coupleInvites.find((item) => item.status === 'pending' && item.invite_code.length === 6)?.invite_code ?? null;
  const currentCode = localInviteCode ?? pendingInviteCode;
  const currentCodeLabel = currentCode ?? '点击生成';
  const accentSurface = withAlpha(theme.colors.primarySoft, theme.dark ? 0.22 : 0.45);
  const glowPrimary = withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.14);
  const glowAccent = withAlpha(theme.colors.accent, theme.dark ? 0.14 : 0.12);
  const panelBackground = theme.dark ? withAlpha(theme.colors.card, 0.9) : withAlpha('#ffffff', 0.8);
  const lightPanel = theme.dark ? withAlpha(theme.colors.surface, 0.9) : theme.colors.surface;
  const mutedBorder = withAlpha(theme.colors.cardBorder, theme.dark ? 0.85 : 0.7);
  const bottomHint = theme.dark ? withAlpha(theme.colors.textMuted, 0.82) : withAlpha(theme.colors.textMuted, 0.72);

  const bindStatusTitle = isBound ? (isRoleConfirmed ? '已完成连接' : '等待主厨确认') : '等待连接...';
  const bindStatusSubtitle = isBound
    ? isRoleConfirmed
      ? `你和 ${partnerUser?.nickname ?? '另一半'} 已经完成绑定，可以继续进入主页。`
      : isPublisher
        ? `你和 ${partnerUser?.nickname ?? '另一半'} 已经完成绑定，请继续确认角色。`
        : `你和 ${partnerUser?.nickname ?? '另一半'} 已经完成绑定，主厨确认后会自动进入首页。`
    : '绑定另一半，共同开启只属于你们的美食与爱之日常。';

  useEffect(() => {
    if (!relationship || relationship.status !== 'active' || !currentUser) {
      return;
    }

    const nextStep = useAppStore.getState().nextStep;
    if (nextStep && nextStep !== 'bind' && nextStep !== 'wait_role_confirm') {
      navigation.replace(routeForNextStep(nextStep));
    }
  }, [currentUser, navigation, relationship, relationship?.role_confirmation_status, relationship?.status]);

  useEffect(() => {
    if (!currentUser || isRoleConfirmed) {
      return undefined;
    }

    const timer = setInterval(() => {
      void loadBootstrap(currentUser.id).catch(() => undefined);
    }, 3000);

    return () => clearInterval(timer);
  }, [currentUser, isRoleConfirmed, loadBootstrap]);

  const handleCreateInvite = async () => {
    if (!currentUser || isCreatingInvite) {
      return;
    }

    setIsCreatingInvite(true);
    try {
      const { data } = await phaseOneApi.createInvite();
      setLocalInviteCode(data.invite_code);
      await loadBootstrap(currentUser.id);
      dialog.alert('邀请码已更新', `新的邀请码：${data.invite_code}`);
    } catch {
      dialog.alert('生成失败', '请稍后再试');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleBind = async () => {
    if (!currentUser || isBinding) {
      return;
    }

    const targetInviteCode = inviteCode.trim().toUpperCase();
    if (!targetInviteCode) {
      dialog.alert('请输入邀请码', '请填写另一半发给你的邀请码');
      return;
    }

    setIsBinding(true);
    try {
      await phaseOneApi.bindByInvite(targetInviteCode);
      await loadBootstrap(currentUser.id);
      navigation.replace('RoleConfirm');
    } catch {
      dialog.alert('绑定失败', '请确认邀请码来自食客，且双方还没有绑定关系');
    } finally {
      setIsBinding(false);
    }
  };

  const handleCopyCode = () => {
    if (!currentCode) {
      dialog.alert('还没有邀请码', '先点击发送邀请生成一个专属邀请码');
      return;
    }

    dialog.alert('邀请码已选中', `当前邀请码：${currentCode}`);
  };

  const handleResetRole = async () => {
    if (isResettingRole) {
      return;
    }

    if (isBound) {
      dialog.alert('已完成绑定', '当前关系已建立，暂时不能重新选择身份');
      return;
    }

    setIsResettingRole(true);
    try {
      await resetPreferredRole();
      navigation.replace('RoleSelect');
    } catch {
      dialog.alert('操作失败', '请稍后再试');
    } finally {
      setIsResettingRole(false);
    }
  };

  const avatarText = useMemo(() => {
    const source = currentUser?.nickname?.trim();
    return source ? source.slice(0, 1) : '爱';
  }, [currentUser?.nickname]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View pointerEvents="none" style={[styles.blob, styles.blobTop, { backgroundColor: glowPrimary }]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBottom, { backgroundColor: glowAccent }]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 24, paddingBottom: Math.max(insets.bottom + 28, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.heroOrb,
              {
                backgroundColor: accentSurface,
                borderColor: withAlpha('#ffffff', theme.dark ? 0.15 : 0.92),
                shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.28 : 0.3),
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.heroOrbGlow,
                { backgroundColor: withAlpha(theme.colors.primary, theme.dark ? 0.16 : 0.1) },
              ]}
            />
            <Heart size={36} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{bindStatusTitle}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{bindStatusSubtitle}</Text>
        </View>

        <View
          style={[
            styles.userCard,
            {
              backgroundColor: panelBackground,
              borderColor: withAlpha(theme.colors.secondarySoft, theme.dark ? 0.45 : 0.7),
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.userCardGlow,
              { backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.18 : 0.26) },
            ]}
          />
          <View style={[styles.avatar, { backgroundColor: theme.colors.secondarySoft }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{avatarText}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{currentUser?.nickname ?? '未登录用户'}</Text>
            <Text style={[styles.userId, { color: theme.colors.textMuted }]}>ID: {currentUser?.id ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.stack}>
          {isConsumer ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: lightPanel,
                  borderColor: mutedBorder,
                  shadowColor: theme.colors.shadow,
                },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.floatingDot,
                  { backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.32 : 0.88) },
                ]}
              />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                {isBound ? '等待主厨确认' : '我的专属邀请码'}
              </Text>

              <View
                style={[
                  styles.codePanel,
                  { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.3) },
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.codeText, { color: theme.colors.primary, letterSpacing: currentCode ? 6 : 0 }]}
                >
                  {currentCodeLabel}
                </Text>
                <Pressable style={styles.copyButton} onPress={handleCopyCode}>
                  <Copy size={18} color={theme.colors.textSoft} strokeWidth={2.2} />
                </Pressable>
              </View>

              <Text style={[styles.cardHint, { color: theme.colors.textMuted }]}>
                {isBound ? '主厨正在填写在一起时间，确认后你会自动进入首页' : '将此码发给主厨，主厨绑定并确认后你会自动进入首页'}
              </Text>

              {!isBound ? (
                <RomanticGradientButton
                  title={isCreatingInvite ? '生成中...' : '生成邀请码'}
                  onPress={handleCreateInvite}
                  disabled={isCreatingInvite}
                  icon={isCreatingInvite ? <ActivityIndicator size="small" color="#ffffff" /> : <Send size={16} color="#ffffff" strokeWidth={2.4} />}
                  style={{ marginTop: 20 }}
                />
              ) : null}
            </View>
          ) : null}

          {isPublisher ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: lightPanel,
                  borderColor: mutedBorder,
                  shadowColor: theme.colors.shadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>输入食客的邀请码</Text>

            <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface, borderColor: mutedBorder }]}>
              <KeyRound size={16} color={theme.colors.textSoft} strokeWidth={2.2} />
              <TextInput
                value={inviteCode}
                onChangeText={(value) => setInviteCode(value.toUpperCase())}
                placeholder="输入6位绑定码"
                maxLength={6}
                autoCapitalize="characters"
                placeholderTextColor={withAlpha(theme.colors.textSoft, 0.82)}
                style={[styles.input, { color: theme.colors.text }]}
              />
            </View>

            <RomanticGradientButton
              title={isBinding ? '绑定中...' : '确认绑定'}
              disabled={isBinding}
              onPress={handleBind}
              icon={isBinding ? <ActivityIndicator size="small" color="#ffffff" /> : undefined}
              style={{ marginTop: 20 }}
            />

            {isBound ? (
              <Pressable
                style={styles.roleLink}
                onPress={() => navigation.navigate(isRoleConfirmed ? 'MainTabs' : 'RoleConfirm')}
              >
                <Text style={[styles.roleLinkText, { color: theme.colors.primary }]}>
                  {isRoleConfirmed ? '进入主页' : '继续角色确认'}
                </Text>
              </Pressable>
            ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {!isBound ? (
            <Pressable
              disabled={isResettingRole}
              style={[styles.resetRoleButton, isResettingRole ? styles.resetRoleButtonDisabled : null]}
              onPress={handleResetRole}
            >
              {isResettingRole ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
              <Text style={[styles.resetRoleText, { color: theme.colors.primary }]}>
                {isResettingRole ? '处理中...' : '重新选择身份'}
              </Text>
            </Pressable>
          ) : null}
          <Ticket size={18} color={bottomHint} strokeWidth={2.2} />
          <Text style={[styles.footerText, { color: bottomHint }]}>LOVE MENU SECURE CONNECTION</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTop: {
    width: 300,
    height: 300,
    top: -100,
    left: -50,
  },
  blobBottom: {
    width: 400,
    height: 400,
    bottom: 100,
    right: -100,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    gap: 32,
  },
  hero: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOrb: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  heroOrbGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    marginBottom: 8,
  },
  heroSubtitle: {
    maxWidth: 250,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  userCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 6,
  },
  userCardGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 128,
    height: 128,
    borderBottomLeftRadius: 999,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    lineHeight: 20,
  },
  stack: {
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 6,
  },
  floatingDot: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 32,
    height: 32,
    borderRadius: 999,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  codePanel: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 52,
  },
  codeText: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 6,
    fontWeight: '500',
  },
  copyButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  cardHint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  inputWrap: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 3,
    paddingVertical: 14,
  },
  secondaryButton: {
    marginTop: 16,
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  roleLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  roleLinkText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  footer: {
    marginTop: 4,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetRoleButton: {
    minHeight: 36,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetRoleButtonDisabled: {
    opacity: 0.68,
  },
  resetRoleText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  footerText: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.6,
    fontWeight: '600',
  },
});
