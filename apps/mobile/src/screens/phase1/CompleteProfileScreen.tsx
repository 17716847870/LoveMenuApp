import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, ImagePlus, LockKeyhole, UserRound, XCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDialog } from '../../components/AppDialog';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { uploadApi } from '../../services/uploadApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { routeForNextStep } from '../../utils/onboarding';
import { isValidLoginPassword, loginPasswordRuleText } from '../../utils/password';

type Props = NativeStackScreenProps<RootStackParamList, 'CompleteProfile'>;
type GenderChoice = 'male' | 'female';

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

export function CompleteProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const currentUser = useAppStore((state) => state.currentUser);
  const completeRegistrationProfile = useAppStore((state) => state.completeRegistrationProfile);
  const [nickname, setNickname] = useState(currentUser?.nickname ?? '');
  const [gender, setGender] = useState<GenderChoice | null>(currentUser?.gender ?? null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url ?? '');
  const [avatarObjectKey, setAvatarObjectKey] = useState(currentUser?.avatar_object_key ?? '');
  const [busyAction, setBusyAction] = useState<'avatar' | 'submit' | 'check' | null>(null);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);

  const avatarFallback = useMemo(() => {
    const source = nickname.trim() || currentUser?.nickname?.trim();
    return source ? source.slice(0, 1) : '你';
  }, [currentUser?.nickname, nickname]);

  useEffect(() => {
    setNickname(currentUser?.nickname ?? '');
    setGender(currentUser?.gender ?? null);
    setAvatarUrl(currentUser?.avatar_url ?? '');
    setAvatarObjectKey(currentUser?.avatar_object_key ?? '');
  }, [currentUser?.avatar_object_key, currentUser?.avatar_url, currentUser?.gender, currentUser?.id, currentUser?.nickname]);

  const handleCheckNickname = async () => {
    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      setNicknameAvailable(false);
      dialog.alert('用户名不能为空', '请输入一个想展示给对方的用户名。');
      return false;
    }

    setBusyAction('check');
    try {
      const { data } = await phaseOneApi.checkNicknameAvailability(cleanNickname);
      setNicknameAvailable(data.available);
      if (!data.available) {
        dialog.alert('用户名已被使用', '换一个更特别的名字吧。');
      }
      return data.available;
    } catch {
      dialog.alert('检查失败', '暂时无法检查用户名，请稍后再试。');
      return false;
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

  const handleSubmit = async () => {
    const cleanNickname = nickname.trim();
    const cleanPassword = password.trim();
    if (!cleanNickname) {
      dialog.alert('用户名不能为空', '请输入用户名。');
      return;
    }
    if (!gender) {
      dialog.alert('请选择性别', '绑定情侣前需要先确认你的性别。');
      return;
    }
    if (!isValidLoginPassword(cleanPassword)) {
      dialog.alert('密码格式不符合要求', loginPasswordRuleText);
      return;
    }
    if (cleanPassword !== confirmPassword.trim()) {
      dialog.alert('两次密码不一致', '请重新确认登录密码。');
      return;
    }

    const isAvailable = nicknameAvailable === true ? true : await handleCheckNickname();
    if (!isAvailable) {
      return;
    }

    setBusyAction('submit');
    try {
      await completeRegistrationProfile({
        nickname: cleanNickname,
        password: cleanPassword,
        avatar_url: avatarObjectKey.trim() || avatarUrl.trim() || null,
        gender,
      });
      const nextStep = useAppStore.getState().nextStep ?? 'select_role';
      navigation.replace(routeForNextStep(nextStep));
    } catch (error) {
      dialog.alert('保存失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="完善资料" subtitle="设置登录密码和展示给 Ta 的名字" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: withAlpha(theme.colors.cardBorder, theme.dark ? 0.72 : 0.5),
              shadowColor: withAlpha(theme.colors.primary, 0.15),
            },
          ]}
        >
          <Pressable
            style={[styles.avatarWrap, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.surface }]}
            disabled={busyAction === 'avatar'}
            onPress={pickAvatarFromLibrary}
          >
            {avatarUrl.trim() ? (
              <Image source={{ uri: avatarUrl.trim() }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{avatarFallback}</Text>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary }]}>
              {busyAction === 'avatar' ? <ActivityIndicator color="#ffffff" size="small" /> : <ImagePlus size={16} color="#ffffff" />}
            </View>
          </Pressable>

          <View style={styles.avatarActions}>
            <Pressable style={[styles.smallButton, { borderColor: theme.colors.cardBorder }]} onPress={pickAvatarFromLibrary}>
              <ImagePlus size={16} color={theme.colors.primary} />
              <Text style={[styles.smallButtonText, { color: theme.colors.primary }]}>相册</Text>
            </Pressable>
            <Pressable style={[styles.smallButton, { borderColor: theme.colors.cardBorder }]} onPress={takeAvatarPhoto}>
              <Camera size={16} color={theme.colors.primary} />
              <Text style={[styles.smallButtonText, { color: theme.colors.primary }]}>拍照</Text>
            </Pressable>
          </View>

          <View style={styles.formStack}>
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSoft }]}>用户名</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.inputBorder,
                  },
                ]}
              >
                <UserRound size={18} color={theme.colors.textSoft} strokeWidth={2} />
                <TextInput
                  value={nickname}
                  onChangeText={(value) => {
                    setNickname(value);
                    setNicknameAvailable(null);
                  }}
                  placeholder="设置唯一用户名"
                  placeholderTextColor={theme.colors.textSoft}
                  style={[styles.input, { color: theme.colors.inputText }]}
                />
                <Pressable style={styles.checkButton} disabled={busyAction === 'check'} onPress={handleCheckNickname}>
                  {busyAction === 'check' ? (
                    <ActivityIndicator color={theme.colors.primary} size="small" />
                  ) : nicknameAvailable === true ? (
                    <CheckCircle2 size={18} color={theme.colors.success} />
                  ) : nicknameAvailable === false ? (
                    <XCircle size={18} color={theme.colors.danger} />
                  ) : (
                    <Text style={[styles.checkButtonText, { color: theme.colors.primary }]}>检查</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSoft }]}>性别</Text>
              <View style={styles.genderRow}>
                {[
                  { key: 'male' as const, title: '男生' },
                  { key: 'female' as const, title: '女生' },
                ].map((item) => {
                  const active = gender === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      style={[
                        styles.genderCard,
                        {
                          backgroundColor: active ? withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.08) : theme.colors.surfaceAlt,
                          borderColor: active ? theme.colors.primary : theme.colors.inputBorder,
                        },
                      ]}
                      onPress={() => setGender(item.key)}
                    >
                      <Text style={[styles.genderText, { color: active ? theme.colors.primary : theme.colors.text }]}>
                        {item.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSoft }]}>登录密码</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.inputBorder,
                  },
                ]}
              >
                <LockKeyhole size={18} color={theme.colors.textSoft} strokeWidth={2} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="至少 8 位，含小写字母和数字"
                  secureTextEntry
                  placeholderTextColor={theme.colors.textSoft}
                  style={[styles.input, { color: theme.colors.inputText }]}
                />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSoft }]}>确认密码</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.inputBorder,
                  },
                ]}
              >
                <LockKeyhole size={18} color={theme.colors.textSoft} strokeWidth={2} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="再次输入登录密码"
                  secureTextEntry
                  placeholderTextColor={theme.colors.textSoft}
                  style={[styles.input, { color: theme.colors.inputText }]}
                />
              </View>
            </View>

            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.primaryDeep, shadowColor: theme.colors.shadow },
                busyAction === 'submit' ? styles.submitButtonDisabled : null,
              ]}
              disabled={busyAction === 'submit'}
              onPress={handleSubmit}
            >
              {busyAction === 'submit' ? <ActivityIndicator color="#ffffff" size="small" /> : null}
              <Text style={styles.submitButtonText}>{busyAction === 'submit' ? '保存中...' : '完成并继续'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 5,
  },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  avatarText: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  smallButton: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smallButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  formStack: {
    width: '100%',
    marginTop: 24,
    gap: 14,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  inputWrap: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderCard: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  checkButton: {
    minWidth: 46,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
});
