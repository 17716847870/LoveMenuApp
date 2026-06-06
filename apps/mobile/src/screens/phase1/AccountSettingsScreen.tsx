import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { BadgeCheck, Heart, HeartCrack, KeyRound, LockKeyhole, LogOut, Mail, MessageCircle, Phone, Save, ShieldCheck, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDialogSheet } from '../../components/AppDialog';
import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { uploadApi } from '../../services/uploadApi';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { isValidLoginPassword, loginPasswordRuleText } from '../../utils/password';

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
  const { currentUser, partnerUser, previewRole, relationship, updateProfile, loadBootstrap, unbindRelationship, logout } =
    useAppStore();
  const [busyAction, setBusyAction] = useState<
    | 'save'
    | 'avatar'
    | 'unbind'
    | 'logout'
    | 'password'
    | 'passwordCode'
    | 'phoneIdentityCode'
    | 'phoneIdentity'
    | 'newPhoneCode'
    | 'phoneChange'
    | null
  >(null);
  const [nickname, setNickname] = useState(currentUser?.nickname ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url ?? '');
  const [avatarObjectKey, setAvatarObjectKey] = useState(currentUser?.avatar_object_key ?? '');
  const [passwordSheetVisible, setPasswordSheetVisible] = useState(false);
  const [passwordCode, setPasswordCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordCodeCooldown, setPasswordCodeCooldown] = useState(0);
  const [phoneSheetVisible, setPhoneSheetVisible] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'identity' | 'newPhone'>('identity');
  const [phoneIdentityMethod, setPhoneIdentityMethod] = useState<'sms' | 'password'>('sms');
  const [phoneIdentityCode, setPhoneIdentityCode] = useState('');
  const [phoneIdentityPassword, setPhoneIdentityPassword] = useState('');
  const [phoneIdentityToken, setPhoneIdentityToken] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneCode, setNewPhoneCode] = useState('');
  const [phoneIdentityCodeCooldown, setPhoneIdentityCodeCooldown] = useState(0);
  const [newPhoneCodeCooldown, setNewPhoneCodeCooldown] = useState(0);

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

  useEffect(() => {
    if (passwordCodeCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setPasswordCodeCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [passwordCodeCooldown]);

  useEffect(() => {
    if (phoneIdentityCodeCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setPhoneIdentityCodeCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [phoneIdentityCodeCooldown]);

  useEffect(() => {
    if (newPhoneCodeCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setNewPhoneCodeCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [newPhoneCodeCooldown]);

  const resetPasswordSheet = () => {
    setPasswordCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordCodeCooldown(0);
  };

  const closePasswordSheet = () => {
    setPasswordSheetVisible(false);
    resetPasswordSheet();
  };

  const handleSendPasswordCode = async () => {
    if (!currentUser?.phone || busyAction === 'passwordCode' || passwordCodeCooldown > 0) {
      return;
    }

    setBusyAction('passwordCode');
    try {
      const { data } = await phaseOneApi.sendSmsCode({ phone: currentUser.phone, scene: 'reset_password' });
      setPasswordCodeCooldown(data.retry_after_seconds);
      dialog.alert('验证码已发送', '请查看手机短信。');
    } catch (error) {
      dialog.alert('发送失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setBusyAction(null);
    }
  };

  const handleChangePassword = async () => {
    const cleanNewPassword = newPassword.trim();
    if (!passwordCode.trim()) {
      dialog.alert('请输入验证码', '请填写短信验证码。');
      return;
    }
    if (!isValidLoginPassword(cleanNewPassword)) {
      dialog.alert('密码格式不符合要求', loginPasswordRuleText);
      return;
    }
    if (cleanNewPassword !== confirmNewPassword.trim()) {
      dialog.alert('两次密码不一致', '请重新确认新密码。');
      return;
    }

    setBusyAction('password');
    try {
      await phaseOneApi.changePassword({
        sms_code: passwordCode.trim(),
        new_password: cleanNewPassword,
      });
      closePasswordSheet();
      logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      dialog.alert('修改成功', '请使用新密码重新登录。');
    } catch (error) {
      dialog.alert('修改失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setBusyAction(null);
    }
  };

  const resetPhoneSheet = () => {
    setPhoneStep('identity');
    setPhoneIdentityMethod('sms');
    setPhoneIdentityCode('');
    setPhoneIdentityPassword('');
    setPhoneIdentityToken('');
    setNewPhone('');
    setNewPhoneCode('');
    setPhoneIdentityCodeCooldown(0);
    setNewPhoneCodeCooldown(0);
  };

  const closePhoneSheet = () => {
    setPhoneSheetVisible(false);
    resetPhoneSheet();
  };

  const handleSendPhoneIdentityCode = async () => {
    if (!currentUser?.phone || busyAction === 'phoneIdentityCode' || phoneIdentityCodeCooldown > 0) {
      return;
    }

    setBusyAction('phoneIdentityCode');
    try {
      const { data } = await phaseOneApi.sendSmsCode({ phone: currentUser.phone, scene: 'verify_bound_phone' });
      setPhoneIdentityCodeCooldown(data.retry_after_seconds);
      dialog.alert('验证码已发送', '请查看当前绑定手机号短信。');
    } catch (error) {
      dialog.alert('发送失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerifyPhoneIdentity = async () => {
    if (phoneIdentityMethod === 'sms' && !phoneIdentityCode.trim()) {
      dialog.alert('请输入验证码', '请填写当前手机号收到的验证码。');
      return;
    }
    if (phoneIdentityMethod === 'password' && !phoneIdentityPassword.trim()) {
      dialog.alert('请输入登录密码', '请填写当前账号的登录密码。');
      return;
    }

    setBusyAction('phoneIdentity');
    try {
      const { data } = await phaseOneApi.verifyPhoneChangeIdentity({
        method: phoneIdentityMethod,
        sms_code: phoneIdentityMethod === 'sms' ? phoneIdentityCode.trim() : undefined,
        password: phoneIdentityMethod === 'password' ? phoneIdentityPassword.trim() : undefined,
      });
      setPhoneIdentityToken(data.identity_token);
      setPhoneStep('newPhone');
    } catch (error) {
      dialog.alert('验证失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendNewPhoneCode = async () => {
    const cleanPhone = newPhone.trim();
    if (busyAction === 'newPhoneCode' || newPhoneCodeCooldown > 0) {
      return;
    }
    if (!/^1\d{10}$/.test(cleanPhone)) {
      dialog.alert('手机号格式不正确', '请输入 11 位中国大陆手机号。');
      return;
    }
    if (cleanPhone === currentUser?.phone) {
      dialog.alert('手机号未变化', '新手机号不能和当前手机号一样。');
      return;
    }

    setBusyAction('newPhoneCode');
    try {
      const { data } = await phaseOneApi.sendSmsCode({ phone: cleanPhone, scene: 'bind_new_phone' });
      setNewPhoneCodeCooldown(data.retry_after_seconds);
      dialog.alert('验证码已发送', '请查看新手机号短信。');
    } catch (error) {
      dialog.alert('发送失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setBusyAction(null);
    }
  };

  const handleChangePhone = async () => {
    const cleanPhone = newPhone.trim();
    if (!phoneIdentityToken) {
      dialog.alert('身份验证已过期', '请重新验证当前账号身份。');
      setPhoneStep('identity');
      return;
    }
    if (!/^1\d{10}$/.test(cleanPhone)) {
      dialog.alert('手机号格式不正确', '请输入 11 位中国大陆手机号。');
      return;
    }
    if (!newPhoneCode.trim()) {
      dialog.alert('请输入验证码', '请填写新手机号收到的验证码。');
      return;
    }

    setBusyAction('phoneChange');
    try {
      await phaseOneApi.changePhone({
        identity_token: phoneIdentityToken,
        new_phone: cleanPhone,
        new_phone_code: newPhoneCode.trim(),
      });
      await loadBootstrap();
      closePhoneSheet();
      dialog.alert('换绑成功', '手机号已经更新。');
    } catch (error) {
      dialog.alert('换绑失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setBusyAction(null);
    }
  };

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
             renderEditableRow({ icon: UserRound, label: '昵称', value: nickname, onChangeText: setNickname, placeholder: '填写昵称' })
          ) : null}
          <ActionInfoRow icon={Phone} label="手机号" value={currentUser?.phone ?? '未绑定'} actionText="更换" onPress={() => setPhoneSheetVisible(true)} />
          {renderEditableRow({ icon: Mail, label: '邮箱', value: email, onChangeText: setEmail, placeholder: '未绑定' })}
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
            <Pressable
              style={({ pressed }) => [
                styles.changePasswordButton,
                {
                  backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.2 : 0.45),
                  borderColor: withAlpha(theme.colors.primary, 0.18),
                  opacity: pressed ? 0.84 : 1,
                },
              ]}
              onPress={() => setPasswordSheetVisible(true)}
            >
              <KeyRound size={18} color={theme.colors.primary} strokeWidth={2.5} />
              <Text style={[styles.changePasswordText, { color: theme.colors.primary }]}>修改密码</Text>
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

      <AppDialogSheet visible={passwordSheetVisible} onClose={closePasswordSheet} style={styles.passwordSheet}>
        <View style={styles.passwordSheetHeader}>
          <Text style={[styles.passwordSheetTitle, { color: theme.colors.text }]}>修改密码</Text>
          <Text style={[styles.passwordSheetSubtitle, { color: theme.colors.textMuted }]}>
            通过当前绑定手机号验证码确认。
          </Text>
        </View>

        <View style={styles.passwordForm}>
          <View style={styles.passwordFieldWrap}>
            <Text style={[styles.passwordFieldLabel, { color: theme.colors.textSoft }]}>短信验证码</Text>
            <View style={[styles.passwordInputWrap, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.inputBorder }]}>
              <MessageCircle size={18} color={theme.colors.textSoft} strokeWidth={2} />
              <TextInput
                value={passwordCode}
                onChangeText={setPasswordCode}
                placeholder="6 位验证码"
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={theme.colors.textSoft}
                style={[styles.passwordInput, { color: theme.colors.inputText }]}
              />
              <Pressable
                style={[
                  styles.passwordCodeButton,
                  { borderColor: theme.colors.cardBorder },
                  busyAction === 'passwordCode' || passwordCodeCooldown > 0 ? styles.passwordCodeButtonDisabled : null,
                ]}
                disabled={busyAction === 'passwordCode' || passwordCodeCooldown > 0}
                onPress={handleSendPasswordCode}
              >
                <Text style={[styles.passwordCodeButtonText, { color: theme.colors.primary }]}>
                  {busyAction === 'passwordCode' ? '发送中' : passwordCodeCooldown > 0 ? `${passwordCodeCooldown}s` : '发送'}
                </Text>
              </Pressable>
            </View>
          </View>

          {renderPasswordInput({
            label: '新密码',
            value: newPassword,
            onChangeText: setNewPassword,
            placeholder: '至少 8 位，含小写字母和数字',
          })}
          {renderPasswordInput({
            label: '确认新密码',
            value: confirmNewPassword,
            onChangeText: setConfirmNewPassword,
            placeholder: '再次输入新密码',
          })}

          <Pressable
            style={[
              styles.passwordSubmitButton,
              { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
              busyAction === 'password' ? styles.passwordSubmitButtonDisabled : null,
            ]}
            disabled={busyAction === 'password'}
            onPress={handleChangePassword}
          >
            <LockKeyhole size={18} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.passwordSubmitText}>{busyAction === 'password' ? '修改中...' : '确认修改'}</Text>
          </Pressable>
        </View>
      </AppDialogSheet>

      <AppDialogSheet visible={phoneSheetVisible} onClose={closePhoneSheet} style={styles.passwordSheet}>
        <View style={styles.passwordSheetHeader}>
          <Text style={[styles.passwordSheetTitle, { color: theme.colors.text }]}>换绑手机号</Text>
          <Text style={[styles.passwordSheetSubtitle, { color: theme.colors.textMuted }]}>
            {phoneStep === 'identity' ? '先验证当前账号身份。' : '再验证新的手机号。'}
          </Text>
        </View>

        <View style={styles.passwordForm}>
          {phoneStep === 'identity' ? (
            <>
              <View style={[styles.segmentControl, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Pressable
                  style={[
                    styles.segmentItem,
                    phoneIdentityMethod === 'sms' ? { backgroundColor: theme.colors.primary } : null,
                  ]}
                  onPress={() => setPhoneIdentityMethod('sms')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: phoneIdentityMethod === 'sms' ? '#ffffff' : theme.colors.textMuted },
                    ]}
                  >
                    手机验证码
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.segmentItem,
                    phoneIdentityMethod === 'password' ? { backgroundColor: theme.colors.primary } : null,
                  ]}
                  onPress={() => setPhoneIdentityMethod('password')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: phoneIdentityMethod === 'password' ? '#ffffff' : theme.colors.textMuted },
                    ]}
                  >
                    登录密码
                  </Text>
                </Pressable>
              </View>

              {phoneIdentityMethod === 'sms' ? (
                <View style={styles.passwordFieldWrap}>
                  <Text style={[styles.passwordFieldLabel, { color: theme.colors.textSoft }]}>当前手机号验证码</Text>
                  <View style={[styles.passwordInputWrap, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.inputBorder }]}>
                    <MessageCircle size={18} color={theme.colors.textSoft} strokeWidth={2} />
                    <TextInput
                      value={phoneIdentityCode}
                      onChangeText={setPhoneIdentityCode}
                      placeholder="6 位验证码"
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholderTextColor={theme.colors.textSoft}
                      style={[styles.passwordInput, { color: theme.colors.inputText }]}
                    />
                    <Pressable
                      style={[
                        styles.passwordCodeButton,
                        { borderColor: theme.colors.cardBorder },
                        busyAction === 'phoneIdentityCode' || phoneIdentityCodeCooldown > 0 ? styles.passwordCodeButtonDisabled : null,
                      ]}
                      disabled={busyAction === 'phoneIdentityCode' || phoneIdentityCodeCooldown > 0}
                      onPress={handleSendPhoneIdentityCode}
                    >
                      <Text style={[styles.passwordCodeButtonText, { color: theme.colors.primary }]}>
                        {busyAction === 'phoneIdentityCode' ? '发送中' : phoneIdentityCodeCooldown > 0 ? `${phoneIdentityCodeCooldown}s` : '发送'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                renderPasswordInput({
                  label: '登录密码',
                  value: phoneIdentityPassword,
                  onChangeText: setPhoneIdentityPassword,
                  placeholder: '请输入当前登录密码',
                })
              )}

              <Pressable
                style={[
                  styles.passwordSubmitButton,
                  { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
                  busyAction === 'phoneIdentity' ? styles.passwordSubmitButtonDisabled : null,
                ]}
                disabled={busyAction === 'phoneIdentity'}
                onPress={handleVerifyPhoneIdentity}
              >
                <ShieldCheck size={18} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.passwordSubmitText}>{busyAction === 'phoneIdentity' ? '验证中...' : '下一步'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.passwordFieldWrap}>
                <Text style={[styles.passwordFieldLabel, { color: theme.colors.textSoft }]}>新手机号</Text>
                <View style={[styles.passwordInputWrap, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.inputBorder }]}>
                  <Phone size={18} color={theme.colors.textSoft} strokeWidth={2} />
                  <TextInput
                    value={newPhone}
                    onChangeText={setNewPhone}
                    placeholder="请输入新手机号"
                    keyboardType="phone-pad"
                    maxLength={11}
                    placeholderTextColor={theme.colors.textSoft}
                    style={[styles.passwordInput, { color: theme.colors.inputText }]}
                  />
                </View>
              </View>

              <View style={styles.passwordFieldWrap}>
                <Text style={[styles.passwordFieldLabel, { color: theme.colors.textSoft }]}>新手机号验证码</Text>
                <View style={[styles.passwordInputWrap, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.inputBorder }]}>
                  <MessageCircle size={18} color={theme.colors.textSoft} strokeWidth={2} />
                  <TextInput
                    value={newPhoneCode}
                    onChangeText={setNewPhoneCode}
                    placeholder="6 位验证码"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor={theme.colors.textSoft}
                    style={[styles.passwordInput, { color: theme.colors.inputText }]}
                  />
                  <Pressable
                    style={[
                      styles.passwordCodeButton,
                      { borderColor: theme.colors.cardBorder },
                      busyAction === 'newPhoneCode' || newPhoneCodeCooldown > 0 ? styles.passwordCodeButtonDisabled : null,
                    ]}
                    disabled={busyAction === 'newPhoneCode' || newPhoneCodeCooldown > 0}
                    onPress={handleSendNewPhoneCode}
                  >
                    <Text style={[styles.passwordCodeButtonText, { color: theme.colors.primary }]}>
                      {busyAction === 'newPhoneCode' ? '发送中' : newPhoneCodeCooldown > 0 ? `${newPhoneCodeCooldown}s` : '发送'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.phoneSheetActions}>
                <Pressable
                  style={[styles.phoneBackButton, { borderColor: theme.colors.cardBorder }]}
                  onPress={() => setPhoneStep('identity')}
                >
                  <Text style={[styles.phoneBackText, { color: theme.colors.textMuted }]}>上一步</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.phoneConfirmButton,
                    { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
                    busyAction === 'phoneChange' ? styles.passwordSubmitButtonDisabled : null,
                  ]}
                  disabled={busyAction === 'phoneChange'}
                  onPress={handleChangePhone}
                >
                  <Text style={styles.passwordSubmitText}>{busyAction === 'phoneChange' ? '换绑中...' : '确认换绑'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </AppDialogSheet>
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

  function ActionInfoRow({
    icon: Icon,
    label,
    value,
    actionText,
    onPress,
  }: {
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    label: string;
    value: string;
    actionText: string;
    onPress: () => void;
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
          <View style={styles.actionInfoRight}>
            <Text style={[styles.infoValue, styles.actionInfoValue, { color: theme.colors.text }]} selectable numberOfLines={1}>
              {value}
            </Text>
            <Pressable
              style={[styles.inlineActionButton, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.45) }]}
              onPress={onPress}
            >
              <Text style={[styles.inlineActionText, { color: theme.colors.primary }]}>{actionText}</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.3) }]} />
      </View>
    );
  }

  function renderEditableRow({
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

  function renderPasswordInput({
    label,
    value,
    onChangeText,
    placeholder,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
  }) {
    return (
      <View style={styles.passwordFieldWrap}>
        <Text style={[styles.passwordFieldLabel, { color: theme.colors.textSoft }]}>{label}</Text>
        <View style={[styles.passwordInputWrap, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.inputBorder }]}>
          <LockKeyhole size={18} color={theme.colors.textSoft} strokeWidth={2} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            secureTextEntry
            placeholderTextColor={theme.colors.textSoft}
            style={[styles.passwordInput, { color: theme.colors.inputText }]}
          />
        </View>
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
  actionInfoRight: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionInfoValue: {
    flexShrink: 1,
  },
  inlineActionButton: {
    minHeight: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  inlineActionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
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
    gap: 12,
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
  changePasswordButton: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  changePasswordText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  passwordSheet: {
    width: '92%',
    maxWidth: 440,
  },
  passwordSheetHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  passwordSheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  passwordSheetSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  passwordForm: {
    gap: 12,
  },
  segmentControl: {
    minHeight: 44,
    borderRadius: 22,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
  },
  passwordFieldWrap: {
    gap: 6,
  },
  passwordFieldLabel: {
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  passwordInputWrap: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 12,
    fontWeight: '600',
  },
  passwordCodeButton: {
    minWidth: 68,
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  passwordCodeButtonDisabled: {
    opacity: 0.55,
  },
  passwordCodeButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  passwordSubmitButton: {
    marginTop: 6,
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  passwordSubmitButtonDisabled: {
    opacity: 0.68,
  },
  passwordSubmitText: {
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  phoneSheetActions: {
    marginTop: 6,
    minHeight: 54,
    flexDirection: 'row',
    gap: 10,
  },
  phoneBackButton: {
    flex: 0.42,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBackText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
  },
  phoneConfirmButton: {
    flex: 0.58,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
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
