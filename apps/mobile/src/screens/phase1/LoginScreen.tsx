import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Heart, KeyRound, LockKeyhole, MessageCircle, Phone } from 'lucide-react-native';

import { useAppDialog } from '../../components/AppDialog';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { routeForNextStep } from '../../utils/onboarding';
import { isValidLoginPassword, loginPasswordRuleText } from '../../utils/password';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type LoginMode = 'code_login' | 'password_login';

const modeOptions: { key: LoginMode; label: string }[] = [
  { key: 'code_login', label: '验证码登录' },
  { key: 'password_login', label: '密码登录' },
];

export function LoginScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const loginWithCode = useAppStore((state) => state.loginWithCode);
  const loginWithPassword = useAppStore((state) => state.loginWithPassword);
  const [mode, setMode] = useState<LoginMode>('code_login');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);

  const isCodeMode = mode !== 'password_login';
  const canSendCode = codeCooldown <= 0 && !isSendingCode && !isSubmitting;
  const buttonLabel = useMemo(() => {
    if (isSubmitting) {
      return '登录中...';
    }
    return isCodeMode ? '登录 / 注册' : '登录';
  }, [isCodeMode, isSubmitting]);

  useEffect(() => {
    if (codeCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setCodeCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [codeCooldown]);

  const requireAgreement = () => {
    if (!agreed) {
      dialog.alert('请先勾选协议', '继续前请先阅读并同意用户协议与隐私政策');
      return false;
    }
    return true;
  };

  const navigateToNextStep = () => {
    const nextStep = useAppStore.getState().nextStep ?? 'select_role';
    navigation.replace(routeForNextStep(nextStep));
  };

  const handleSendCode = async () => {
    if (!canSendCode || !requireAgreement()) {
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      dialog.alert('请输入手机号', '验证码需要发送到你的手机号码。');
      return;
    }

    setIsSendingCode(true);
    try {
      const { data } = await phaseOneApi.sendSmsCode({ phone: cleanPhone, scene: 'login' });
      setCodeCooldown(data.retry_after_seconds);
      dialog.alert('验证码已发送', '请查看手机短信。');
    } catch (error) {
      dialog.alert('发送失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !requireAgreement()) {
      return;
    }

    const cleanPhone = phone.trim();
    const cleanCode = code.trim();
    const cleanPassword = password.trim();
    if (!cleanPhone) {
      dialog.alert('请输入手机号', '手机号不能为空。');
      return;
    }
    if (isCodeMode && cleanCode.length !== 6) {
      dialog.alert('请输入验证码', '验证码为 6 位数字。');
      return;
    }
    if (mode === 'password_login' && !isValidLoginPassword(cleanPassword)) {
      dialog.alert('请输入正确密码', loginPasswordRuleText);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'password_login') {
        await loginWithPassword(cleanPhone, cleanPassword);
      } else {
        await loginWithCode(cleanPhone, cleanCode);
      }
      navigateToNextStep();
    } catch (error) {
      dialog.alert('登录失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: theme.dark ? `${theme.colors.primarySoft}66` : `${theme.colors.primarySoft}99`,
                shadowColor: theme.colors.shadow,
              },
            ]}
          >
            <View
              style={[
                styles.logoGradient,
                {
                  backgroundColor: theme.dark ? `${theme.colors.secondarySoft}55` : `${theme.colors.secondarySoft}aa`,
                },
              ]}
            />
            <Heart size={34} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={[styles.brand, { color: theme.colors.primary }]}>LoveMenu</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSoft }]}>记录点滴，定制专属浪漫</Text>
        </View>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View style={styles.segmented}>
            {modeOptions.map((option) => {
              const active = option.key === mode;
              return (
                <Pressable
                  key={option.key}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                      borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                      shadowColor: active ? theme.colors.shadow : 'transparent',
                    },
                  ]}
                  disabled={isSubmitting}
                  onPress={() => {
                    setMode(option.key);
                    setCode('');
                    setPassword('');
                  }}
                >
                  <Text style={[styles.segmentText, { color: active ? '#ffffff' : theme.colors.textSoft }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.formStack}>
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSoft }]}>手机号码</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.inputBorder,
                  },
                ]}
              >
                <Phone size={18} color={theme.colors.textSoft} strokeWidth={2} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="请输入您的手机号"
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                  placeholderTextColor={theme.colors.textSoft}
                  style={[styles.input, { color: theme.colors.inputText }]}
                />
              </View>
            </View>

            {isCodeMode ? (
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSoft }]}>短信验证码</Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.inputBorder,
                    },
                  ]}
                >
                  <MessageCircle size={18} color={theme.colors.textSoft} strokeWidth={2} />
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="6 位验证码"
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isSubmitting}
                    placeholderTextColor={theme.colors.textSoft}
                    style={[styles.input, { color: theme.colors.inputText }]}
                  />
                  <Pressable
                    style={[
                      styles.codeButton,
                      { borderColor: theme.colors.cardBorder },
                      !canSendCode ? styles.codeButtonDisabled : null,
                    ]}
                    disabled={!canSendCode}
                    onPress={handleSendCode}
                  >
                    {isSendingCode ? (
                      <ActivityIndicator color={theme.colors.primary} size="small" />
                    ) : (
                      <Text style={[styles.codeButtonText, { color: theme.colors.primary }]}>
                        {codeCooldown > 0 ? `${codeCooldown}s` : '发送'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
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
                    editable={!isSubmitting}
                    placeholderTextColor={theme.colors.textSoft}
                    style={[styles.input, { color: theme.colors.inputText }]}
                  />
                </View>
              </View>
            )}

            <Pressable
              style={[
                styles.loginButton,
                {
                  backgroundColor: theme.colors.primaryDeep,
                  shadowColor: theme.colors.shadow,
                },
                isSubmitting ? styles.loginButtonDisabled : null,
              ]}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? <ActivityIndicator color="#ffffff" size="small" /> : <KeyRound size={18} color="#ffffff" />}
              <Text style={styles.loginButtonText}>{buttonLabel}</Text>
            </Pressable>

            <Pressable style={styles.agreementRow} onPress={() => setAgreed((value) => !value)}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: theme.colors.cardBorder,
                    backgroundColor: theme.colors.surfaceAlt,
                  },
                  agreed
                    ? {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      }
                    : null,
                ]}
              >
                {agreed ? <Check size={11} color="#ffffff" strokeWidth={3} /> : null}
              </View>
              <Text style={[styles.agreementText, { color: theme.colors.textSoft }]}>
                我已阅读并同意 <Text style={[styles.agreementLink, { color: theme.colors.primary }]}>用户协议</Text> 与{' '}
                <Text style={[styles.agreementLink, { color: theme.colors.primary }]}>隐私政策</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 28,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 32,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 6,
  },
  logoGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  brand: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 6,
  },
  segmented: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 1,
  },
  segmentText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  formStack: {
    gap: 12,
  },
  fieldWrap: {
    gap: 4,
  },
  fieldLabel: {
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
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
  codeButton: {
    minWidth: 64,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  codeButtonDisabled: {
    opacity: 0.55,
  },
  codeButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.72,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  agreementRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreementText: {
    flexShrink: 1,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  agreementLink: {},
});
