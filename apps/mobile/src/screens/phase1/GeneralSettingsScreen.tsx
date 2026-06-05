import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  BellRing,
  CalendarClock,
  ChevronRight,
  HeartPulse,
  Moon,
  ShieldCheck,
  UtensilsCrossed,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSwitch } from '../../components/AppSwitch';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppNotificationSettings, useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'GeneralSettings'>;
type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type SettingRowProps = {
  icon: IconComponent;
  title: string;
  description: string;
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  trailingText?: string;
};

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

export function GeneralSettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { notificationSettings, setNotificationSetting } = useAppStore();
  const panelBorder = theme.dark ? withAlpha(theme.colors.cardBorder, 0.46) : withAlpha(theme.colors.cardBorder, 0.62);
  const shadowColor = withAlpha(theme.colors.primary, theme.dark ? 0.14 : 0.1);

  const updateNotification = <Key extends keyof AppNotificationSettings>(
    key: Key,
    value: AppNotificationSettings[Key],
  ) => {
    setNotificationSetting(key, value);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="通用设置" subtitle="集中管理提醒、经期和应用偏好" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsGroup title="消息通知">
          <SettingRow
            icon={BellRing}
            title="聊天消息提醒"
            description="收到对方新消息时显示提醒"
            value={notificationSettings.chatMessages}
            onValueChange={(value) => updateNotification('chatMessages', value)}
          />
          <SettingRow
            icon={UtensilsCrossed}
            title="菜单申请提醒"
            description="点单、申请处理和订单状态变化"
            value={notificationSettings.menuApplications}
            onValueChange={(value) => updateNotification('menuApplications', value)}
          />
          <SettingRow
            icon={CalendarClock}
            title="纪念日提醒"
            description="纪念日、打卡和重要日期通知"
            value={notificationSettings.anniversaryReminders}
            onValueChange={(value) => updateNotification('anniversaryReminders', value)}
          />
          <SettingRow
            icon={Moon}
            title="夜间免打扰"
            description="晚间减少非紧急提醒打扰"
            value={notificationSettings.quietHours}
            onValueChange={(value) => updateNotification('quietHours', value)}
          />
        </SettingsGroup>

        <SettingsGroup title="经期与健康">
          <SettingRow
            icon={HeartPulse}
            title="姨妈期提醒设置"
            description="经期开始、预计到来和结束记录提醒"
            value={notificationSettings.periodReminders}
            onValueChange={(value) => updateNotification('periodReminders', value)}
          />
          <SettingRow
            icon={BellRing}
            title="详细提醒规则"
            description="设置提前几天提醒和每日通知时间"
            onPress={() => navigation.navigate('Reminders')}
          />
          <SettingRow
            icon={ShieldCheck}
            title="经期授权管理"
            description="控制对方可以看到的经期信息范围"
            onPress={() => navigation.navigate('Authorization')}
          />
          <SettingRow
            icon={CalendarClock}
            title="周期预测"
            description="查看下次经期预测和建议"
            onPress={() => navigation.navigate('Prediction')}
          />
        </SettingsGroup>
      </ScrollView>
    </View>
  );

  function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={styles.groupWrap}>
        <Text style={[styles.groupTitle, { color: theme.colors.textMuted }]}>{title}</Text>
        <View style={[styles.groupCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor }]}>
          {children}
        </View>
      </View>
    );
  }

  function SettingRow({ icon: Icon, title, description, onPress, value, onValueChange, trailingText }: SettingRowProps) {
    const interactive = Boolean(onPress || onValueChange);

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && interactive ? { opacity: 0.72 } : null]}
        onPress={onPress}
        disabled={!interactive || Boolean(onValueChange)}
      >
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, theme.dark ? 0.26 : 0.56) }]}>
          <Icon size={18} color={theme.colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.rowDescription, { color: theme.colors.textMuted }]}>{description}</Text>
        </View>
        {onValueChange ? <AppSwitch value={value} onValueChange={onValueChange} /> : null}
        {!onValueChange && trailingText ? (
          <Text style={[styles.trailingText, { color: theme.colors.primary }]} numberOfLines={1}>
            {trailingText}
          </Text>
        ) : null}
        {!onValueChange ? <ChevronRight size={18} color={theme.colors.textSoft} strokeWidth={2.2} /> : null}
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 18,
  },
  groupWrap: { gap: 8 },
  groupTitle: {
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  groupCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  row: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  rowDescription: { fontSize: 12, lineHeight: 17 },
  trailingText: {
    maxWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
