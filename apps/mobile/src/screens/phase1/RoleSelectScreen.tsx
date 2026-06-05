import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, ReceiptText, UtensilsCrossed } from 'lucide-react-native';
import { useState } from 'react';

import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { routeForNextStep } from '../../utils/onboarding';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;
type RoleChoice = 'publisher' | 'consumer';
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

export function RoleSelectScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, nextStep, updateOnboardingProfile } = useAppStore();
  const [selectedRole, setSelectedRole] = useState<RoleChoice | null>(currentUser?.preferred_role ?? null);
  const [selectedGender, setSelectedGender] = useState<GenderChoice | null>(currentUser?.gender ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRole || !selectedGender || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateOnboardingProfile(selectedRole, selectedGender);
      const latestStep = useAppStore.getState().nextStep ?? nextStep ?? 'bind';
      navigation.replace(routeForNextStep(latestStep));
    } catch {
      dialog.alert('保存失败', '请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    {
      key: 'publisher' as const,
      title: '我要成为主厨',
      subtitle: '你将负责确认关系、维护菜单和完成点单。',
      hint: '选择主厨后，你的另一半需要选择食客，并把邀请码发给你。',
      icon: UtensilsCrossed,
      accent: theme.colors.primary,
    },
    {
      key: 'consumer' as const,
      title: '我要成为食客',
      subtitle: '你将生成邀请码，等待主厨绑定并确认关系。',
      hint: '选择食客后，你的另一半需要选择主厨，由主厨输入你的邀请码。',
      icon: ReceiptText,
      accent: theme.colors.secondary,
    },
  ];
  const genders = [
    {
      key: 'male' as const,
      title: '男生',
      accent: theme.colors.primary,
    },
    {
      key: 'female' as const,
      title: '女生',
      accent: theme.colors.secondary,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>选择你的身份</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          先确认性别和身份，绑定时系统会校验双方必须是一男一女。
        </Text>
      </View>

      <View style={styles.stack}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>你的性别</Text>
          <View style={styles.genderRow}>
            {genders.map((gender) => {
              const active = selectedGender === gender.key;
              return (
                <Pressable
                  key={gender.key}
                  disabled={isSubmitting}
                  style={[
                    styles.genderCard,
                    {
                      backgroundColor: active ? withAlpha(gender.accent, theme.dark ? 0.16 : 0.08) : theme.colors.surface,
                      borderColor: active ? gender.accent : withAlpha(theme.colors.cardBorder, 0.72),
                    },
                    isSubmitting ? styles.roleCardDisabled : null,
                  ]}
                  onPress={() => setSelectedGender(gender.key)}
                >
                  <Text style={[styles.genderText, { color: active ? gender.accent : theme.colors.text }]}>
                    {gender.title}
                  </Text>
                  {active ? <CheckCircle2 size={18} color={gender.accent} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>你的身份</Text>
        {roles.map((role) => {
          const Icon = role.icon;
          const active = selectedRole === role.key;

          return (
            <Pressable
              key={role.key}
              style={[
                styles.roleCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: active ? role.accent : withAlpha(theme.colors.cardBorder, 0.72),
                  shadowColor: withAlpha(role.accent, 0.14),
                },
                active ? { backgroundColor: withAlpha(role.accent, theme.dark ? 0.14 : 0.08) } : null,
                isSubmitting ? styles.roleCardDisabled : null,
              ]}
              disabled={isSubmitting}
              onPress={() => setSelectedRole(role.key)}
            >
              <View style={[styles.iconWrap, { backgroundColor: withAlpha(role.accent, 0.14) }]}>
                <Icon size={24} color={role.accent} strokeWidth={2.2} />
              </View>
              <View style={styles.roleCopy}>
                <Text style={[styles.roleTitle, { color: theme.colors.text }]}>{role.title}</Text>
                <Text style={[styles.roleSubtitle, { color: theme.colors.textMuted }]}>{role.subtitle}</Text>
                <Text style={[styles.roleHint, { color: role.accent }]}>{role.hint}</Text>
              </View>
              {active ? <CheckCircle2 size={22} color={role.accent} strokeWidth={2.4} /> : null}
            </Pressable>
          );
        })}
        </View>
      </View>

      <RomanticGradientButton
        title={isSubmitting ? '保存中...' : selectedRole && selectedGender ? '确认并继续' : '请选择性别和身份'}
        disabled={!selectedRole || !selectedGender || isSubmitting}
        onPress={handleConfirm}
        icon={isSubmitting ? <ActivityIndicator color="#ffffff" size="small" /> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 76,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  stack: {
    flex: 1,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genderText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
  },
  roleCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 5,
  },
  roleCardDisabled: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCopy: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  roleSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  roleHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
