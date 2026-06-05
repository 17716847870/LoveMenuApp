import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Heart, Phone } from 'lucide-react-native';

import { useAppDialog } from '../../components/AppDialog';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { routeForNextStep } from '../../utils/onboarding';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const login = useAppStore((state) => state.login);
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (targetPhone: string) => {
    if (isSubmitting) {
      return;
    }

    if (!agreed) {
      dialog.alert('请先勾选协议', '登录前请先阅读并同意用户协议与隐私政策');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(targetPhone);
      const nextStep = useAppStore.getState().nextStep ?? 'select_role';
      navigation.replace(routeForNextStep(nextStep));
    } catch {
      dialog.alert('登录失败', '请稍后重试');
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
              onPress={() => handleLogin(phone)}
            >
              {isSubmitting ? <ActivityIndicator color="#ffffff" size="small" /> : null}
              <Text style={styles.loginButtonText}>{isSubmitting ? '登录中...' : '登录 / 注册'}</Text>
              {!isSubmitting ? <Text style={styles.loginButtonArrow}>→</Text> : null}
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
    marginTop: 32,
    marginBottom: 32,
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
    letterSpacing: -0.56,
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
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 6,
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
    letterSpacing: 0.6,
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
  loginButtonArrow: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
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
