import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { BadgeCheck, Heart, HeartCrack, LogOut, Mail, Phone, Save, ShieldCheck, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { uploadApi } from '../../services/uploadApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountSettings'>;

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

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export function AccountSettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, partnerUser, previewRole, relationship, updateProfile, unbindRelationship, logout } =
    useAppStore();
  const [busyAction, setBusyAction] = useState<'save' | 'avatar' | 'unbind' | 'logout' | null>(null);
  const [nickname, setNickname] = useState(currentUser?.nickname ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url ?? '');
  const [avatarObjectKey, setAvatarObjectKey] = useState(currentUser?.avatar_object_key ?? '');

  const panelBorder = withAlpha(theme.colors.cardBorder, theme.dark ? 0.72 : 0.5);
  const roleLabel = previewRole === 'publisher' ? '今日主厨' : '今日食客';
  const partnerLabel = partnerUser?.nickname ?? 'Ta';
  const avatarFallback = useMemo(() => {
    const source = nickname.trim() || currentUser?.nickname?.trim();
    return source ? source.slice(0, 1) : '你';
  }, [currentUser?.nickname, nickname]);
  const partnerAvatarFallback = useMemo(() => {
    const source = partnerUser?.nickname?.trim();
    return source ? source.slice(0, 1) : 'Ta';
  }, [partnerUser?.nickname]);

  const boundDays = useMemo(() => {
    if (!relationship?.bound_at) return 0;
    const diff = Date.now() - new Date(relationship.bound_at).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [relationship?.bound_at]);

  useEffect(() => {
    setNickname(currentUser?.nickname ?? '');
    setEmail(currentUser?.email ?? '');
    setAvatarUrl(currentUser?.avatar_url ?? '');
    setAvatarObjectKey(currentUser?.avatar_object_key ?? '');
  }, [
    currentUser?.avatar_object_key,
    currentUser?.avatar_url,
    currentUser?.email,
    currentUser?.id,
    currentUser?.nickname,
  ]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      dialog.alert('昵称不能为空', '给自己留一个好认的名字吧。');
      return;
    }

    setBusyAction('save');
    try {
      await updateProfile({
        nickname: cleanNickname,
        email: email.trim() || null,
        avatar_url: avatarObjectKey.trim() || avatarUrl.trim() || null,
      });
      dialog.alert('已保存', '个人信息已经更新。');
    } catch {
      dialog.alert('保存失败', '请稍后再试，或检查手机号/邮箱格式是否正确。');
    } finally {
      setBusyAction(null);
    }
  };

  const applyPickedAvatar = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]?.uri) return;
    setBusyAction('avatar');
    try {
      const asset = result.assets[0];
      const { data } = await uploadApi.uploadImage({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      setAvatarUrl(data.url);
      setAvatarObjectKey(data.object_key);
      dialog.alert('头像已上传', '保存个人信息后会正式更新头像。');
    } catch {
      dialog.alert('上传失败', '请确认图片上传配置可用后再试。');
    } finally {
      setBusyAction(null);
    }
  };

  const pickAvatarFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      dialog.alert('需要相册权限', '请允许访问相册后再选择头像。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.86,
    });
    void applyPickedAvatar(result);
  };

  const takeAvatarPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      dialog.alert('需要相机权限', '请允许使用相机后再拍摄头像。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.86,
    });
    void applyPickedAvatar(result);
  };

  const handleAvatarPress = () => {
    dialog.confirm({
      title: '更换头像',
      message: '选择新的头像来源',
      actions: [
        { text: '取消', style: 'cancel' },
        { text: '从相册选择', onPress: pickAvatarFromLibrary },
        { text: '拍照', onPress: takeAvatarPhoto },
      ],
    });
  };

  const handleUnbind = () => {
    if (!relationship) {
      dialog.alert('当前未绑定', '你还没有情侣绑定关系。');
      return;
    }
    dialog.confirm({
      title: '确认解除绑定？',
      message: '只需当前账号确认，双方绑定会立即解除。解除后需要重新使用邀请码绑定。',
      actions: [
        { text: '取消', style: 'cancel' },
        {
          text: '解除绑定',
          style: 'destructive',
          onPress: async () => {
            setBusyAction('unbind');
            await unbindRelationship();
            setBusyAction(null);
            dialog.confirm({
              title: '已解除绑定',
              message: '当前账号已经回到未绑定状态。',
              actions: [
                { text: '留在本页', style: 'cancel' },
                { text: '去绑定页', onPress: () => navigation.replace('Bind') },
              ],
            });
          },
        },
      ],
    });
  };

  const handleLogout = () => {
    dialog.confirm({
      title: '退出登录？',
      message: '退出后会回到登录页，当前账号数据仍会保留。',
      actions: [
        { text: '取消', style: 'cancel' },
        {
          text: '退出登录',
          style: 'destructive',
          onPress: () => {
            setBusyAction('logout');
            logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ],
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="情侣账号" subtitle="共同记录美好，守护我们的爱" onBack={() => navigation.goBack()} />

      <View style={styles.floatingDecoTopRight} pointerEvents="none">
        <Heart size={80} color={withAlpha(theme.colors.primary, 0.15)} fill={withAlpha(theme.colors.primary, 0.15)} strokeWidth={0} />
        <View style={{ position: 'absolute', right: 40, top: 40 }}>
          <Heart size={40} color={withAlpha(theme.colors.primary, 0.2)} fill={withAlpha(theme.colors.primary, 0.2)} strokeWidth={0} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor: withAlpha(theme.colors.primary, 0.15) },
          ]}
        >
          <View style={styles.avatarsContainer}>
            <Pressable
              style={[
                styles.avatarWrap,
                { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.surface },
              ]}
              onPress={handleAvatarPress}
            >
              {avatarUrl.trim() ? (
                <Image source={{ uri: avatarUrl.trim() }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{avatarFallback}</Text>
              )}
            </Pressable>
            {relationship ? (
              <View
                style={[
                  styles.partnerAvatarWrap,
                  { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.surface },
                ]}
              >
                {partnerUser?.avatar_url ? (
                  <Image source={{ uri: partnerUser.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={[styles.avatarText, { color: theme.colors.secondary }]}>{partnerAvatarFallback}</Text>
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.heroTextWrap}>
            <View style={styles.heroTitleRow}>
              {relationship ? (
                 <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
                   {nickname} & {partnerLabel}
                 </Text>
              ) : (
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="填写昵称"
                  placeholderTextColor={theme.colors.textSoft}
                  style={[styles.heroTitleInput, { color: theme.colors.text }]}
                />
              )}
              {relationship ? <Heart size={20} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={0} /> : null}
            </View>

            <View style={[styles.heroSubtitleRow, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.3) }]}>
              <Heart size={14} color={theme.colors.primary} strokeWidth={2} />
              <Text style={[styles.heroSubtitle, { color: theme.colors.primary }]}>
                {relationship ? `我们在一起的第 ${boundDays} 天` : '还没有绑定另一半哦'}
              </Text>
            </View>
          </View>
        </View>

        

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor: withAlpha(theme.colors.primary, 0.08) },
          ]}
        >
          {relationship ? (
             <EditableRow icon={UserRound} label="昵称" value={nickname} onChangeText={setNickname} placeholder="填写昵称" />
          ) : null}
          <InfoRow icon={Phone} label="手机号" value={currentUser?.phone ?? '未绑定'} />
          <EditableRow icon={Mail} label="邮箱" value={email} onChangeText={setEmail} placeholder="未绑定" />
          <InfoRow icon={UserRound} label="用户 ID" value={currentUser ? String(currentUser.id) : '—'} />
          <InfoRow icon={ShieldCheck} label="最近登录" value={formatDateTime(currentUser?.last_login_at)} last />
          
          <View style={styles.buttonWrap}>
            
            <Pressable
              style={({ pressed }) => [
                styles.saveProfileButton,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={handleSaveProfile}
            >
              <Save size={18} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.saveProfileText}>
                {busyAction === 'save' ? '保存中...' : '编辑个人信息'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.bindCard,
            { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor: withAlpha(theme.colors.primary, 0.08) },
          ]}
        >
          <View style={styles.bindHeader}>
            <View>
              <Text style={[styles.bindTitle, { color: theme.colors.text }]}>情侣绑定</Text>
              <Text style={[styles.bindSubtitle, { color: theme.colors.textMuted }]}>
                {relationship ? `已与 ${partnerLabel} 绑定` : '当前未绑定另一半'}
              </Text>
            </View>
            {relationship ? (
              <Pressable onPress={handleUnbind}>
                <Text style={[styles.unbindText, { color: theme.colors.primary }]}>解除绑定</Text>
              </Pressable>
            ) : null}
          </View>

          <View
            style={[
              styles.relationshipPanel,
              { backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.15 : 0.25), borderColor: withAlpha(theme.colors.primary, 0.15) },
            ]}
          >
            <Text style={[styles.relationshipLabel, { color: theme.colors.textMuted }]}>绑定对象</Text>
            <Text style={[styles.relationshipValue, { color: theme.colors.text }]}>{partnerLabel}</Text>
            <Text style={[styles.relationshipMeta, { color: theme.colors.textMuted }]}>
              绑定日期：{formatDateTime(relationship?.bound_at)}
            </Text>
          </View>
        </View>

        <View style={styles.actionStack}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: panelBorder,
                shadowColor: withAlpha(theme.colors.text, 0.08),
                opacity: pressed ? 0.84 : 1,
              },
            ]}
            onPress={handleLogout}
          >
            <LogOut size={18} color={theme.colors.text} strokeWidth={2.4} />
            <Text style={[styles.logoutText, { color: theme.colors.text }]}>
              {busyAction === 'logout' ? '退出中...' : '退出登录'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );

  function InfoRow({
    icon: Icon,
    label,
    value,
    last,
  }: {
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    label: string;
    value: string;
    last?: boolean;
  }) {
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoRowContent}>
          <View style={styles.infoLeft}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.22 : 0.3) },
              ]}
            >
              <Icon size={18} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{label}</Text>
          </View>
          <Text style={[styles.infoValue, { color: theme.colors.text }]} selectable numberOfLines={1}>
            {value}
          </Text>
        </View>
        {last ? null : (
          <View style={[styles.infoDivider, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.3) }]} />
        )}
      </View>
    );
  }

  function EditableRow({
    icon: Icon,
    label,
    value,
    onChangeText,
    placeholder,
  }: {
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
  }) {
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoRowContent}>
          <View style={styles.infoLeft}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.22 : 0.3) },
              ]}
            >
              <Icon size={18} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{label}</Text>
          </View>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textSoft}
            autoCapitalize="none"
            style={[styles.infoInput, { color: theme.colors.text }]}
          />
        </View>
        <View style={[styles.infoDivider, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.3) }]} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 20,
  },
  floatingDecoTopRight: {
    position: 'absolute',
    top: -20,
    right: -20,
    zIndex: 0,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 6,
    zIndex: 10,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 2,
  },
  partnerAvatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  heroTextWrap: {
    alignItems: 'center',
    gap: 8,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTitleInput: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
    padding: 0,
    textAlign: 'center',
  },
  heroSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  
  sectionCard: {
    borderRadius: 26,
    borderWidth: 1.5,
    padding: 20,
    paddingTop: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 5,
  },
  infoRow: {
    minHeight: 64,
    justifyContent: 'center',
  },
  infoRowContent: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
  infoInput: {
    flex: 1,
    minHeight: 46,
    padding: 0,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
  infoDivider: {
    height: 1,
    marginTop: 8,
    marginLeft: 54,
    borderRadius: 1,
  },
  buttonWrap: {
    position: 'relative',
    marginTop: 20,
  },
  
  
  saveProfileButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  saveProfileText: {
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bindCard: {
    borderRadius: 26,
    borderWidth: 1.5,
    padding: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 5,
  },
  bindHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bindTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  bindSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  unbindText: {
    fontSize: 14,
    fontWeight: '700',
  },
  relationshipPanel: {
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
  },
  relationshipLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  relationshipValue: {
    marginTop: 6,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  relationshipMeta: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionStack: {
    gap: 16,
    marginTop: 8,
  },
  logoutButton: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
