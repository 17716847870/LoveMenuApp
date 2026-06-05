import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays, FileText, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSwitch } from '../../components/AppSwitch';
import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { periodApi } from '../../services/periodApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { PeriodPermissionDto } from '../../types/period';

type Props = NativeStackScreenProps<RootStackParamList, 'Authorization'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function AuthorizationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { loadBootstrap } = useAppStore();
  const [viewEnabled, setViewEnabled] = useState(false);
  const [editEnabled, setEditEnabled] = useState(false);
  const [permission, setPermission] = useState<PeriodPermissionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canManagePermission = permission?.canManagePermission ?? false;
  const rows = [
    {
      title: '允许查看经期状态',
      desc: '展示当前阶段、未来预测日历和基础记录摘要',
      icon: CalendarDays,
      type: 'view',
    },
    { title: '允许代为记录', desc: '授权另一半帮你记录经期开始和结束', icon: FileText, type: 'edit' },
  ];

  useEffect(() => {
    let mounted = true;

    periodApi
      .getPermissions()
      .then((response) => {
        if (!mounted) {
          return;
        }
        setPermission(response.data);
        setViewEnabled(response.data.maleViewEnabled);
        setEditEnabled(response.data.maleEditEnabled);
      })
      .catch(() => {
        if (mounted) {
          dialog.alert('加载失败', '暂时无法读取经期授权状态，请稍后再试。');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [dialog]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await periodApi.updatePermissions({
        maleViewEnabled: viewEnabled || editEnabled,
        maleEditEnabled: editEnabled,
      });
      setPermission(response.data);
      await loadBootstrap().catch(() => undefined);
      dialog.alert('已保存', '经期共享授权设置已更新。');
      navigation.goBack();
    } catch {
      dialog.alert('暂时不能保存', '只有经期数据本人可以修改共享授权。');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!canManagePermission) {
      navigation.goBack();
      return;
    }

    try {
      setSaving(true);
      const response = await periodApi.updatePermissions({ maleViewEnabled: false, maleEditEnabled: false });
      setPermission(response.data);
      setViewEnabled(false);
      setEditEnabled(false);
      await loadBootstrap().catch(() => undefined);
      dialog.alert('已关闭授权', '另一半将不能再查看或代记你的经期信息。');
    } catch {
      dialog.alert('暂时不能关闭', '请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader
        title={canManagePermission ? '共享经期状态' : '经期授权说明'}
        subtitle={canManagePermission ? '让另一半更懂你的周期变化' : '查看对方共享给你的范围'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.statusCard,
            {
              marginTop: insets.top > 0 ? 4 : 0,
              backgroundColor: withAlpha(theme.colors.primarySoft, 0.22),
              borderColor: withAlpha(theme.colors.cardBorder, 0.72),
            },
          ]}
        >
          <View style={styles.statusHeader}>
            <View>
              <Text style={[styles.statusLabel, { color: theme.colors.textSoft }]}>当前状态</Text>
              <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                {loading ? '读取中...' : permission?.statusLabel}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.statusPillText, { color: theme.colors.primary }]}>
                {canManagePermission ? '可管理' : '只读'}
              </Text>
            </View>
          </View>
          <Text style={[styles.statusDesc, { color: theme.colors.textMuted }]}>
            {permission?.description ?? '正在读取经期授权状态。'}
          </Text>
          {permission?.grantedAt ? (
            <Text style={[styles.statusTime, { color: theme.colors.textSoft }]}>授权时间：{permission.grantedAt}</Text>
          ) : null}
          {permission?.revokedAt && !permission.maleAccessGranted ? (
            <Text style={[styles.statusTime, { color: theme.colors.textSoft }]}>关闭时间：{permission.revokedAt}</Text>
          ) : null}
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.72) },
          ]}
        >
          {rows.map((item) => {
            const Icon = item.icon;
            return (
              <View key={item.title} style={styles.authRow}>
                <View style={[styles.authIcon, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.4) }]}>
                  <Icon size={18} color={theme.colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.authCopy}>
                  <Text style={[styles.authTitle, { color: theme.colors.text }]}>{item.title}</Text>
                  <Text style={[styles.authDesc, { color: theme.colors.textMuted }]}>{item.desc}</Text>
                </View>
                <AppSwitch
                  value={item.type === 'edit' ? editEnabled : viewEnabled}
                  onValueChange={(value) => {
                    if (loading || saving) {
                      return;
                    }
                    if (item.type === 'edit') {
                      setEditEnabled(value);
                      if (value) {
                        setViewEnabled(true);
                      }
                      return;
                    }
                    setViewEnabled(value);
                    if (!value) {
                      setEditEnabled(false);
                    }
                  }}
                  disabled={!canManagePermission || loading || saving}
                />
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.lockCard,
            {
              backgroundColor: withAlpha(theme.colors.primarySoft, 0.22),
              borderColor: withAlpha(theme.colors.cardBorder, 0.72),
            },
          ]}
        >
          <Lock size={18} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={[styles.lockText, { color: theme.colors.textMuted }]}>
            经期数据只会按你开启的范围共享给绑定伴侣，关闭授权后对方不能继续查看或代记。
          </Text>
        </View>

        {canManagePermission ? (
          <RomanticGradientButton
            title={saving ? '保存中...' : '保存授权设置'}
            disabled={loading || saving}
            onPress={handleSave}
          />
        ) : (
          <RomanticGradientButton title="我知道了" onPress={() => navigation.goBack()} />
        )}
        <Pressable
          style={[
            styles.secondaryButton,
            {
              borderColor: withAlpha(theme.colors.cardBorder, 0.72),
              backgroundColor: withAlpha(theme.colors.primarySoft, 0.08),
            },
          ]}
          onPress={handleRevoke}
          disabled={loading || saving}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            {canManagePermission ? '关闭授权' : '返回'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24 },
  brand: { fontSize: 26, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  title: { marginTop: 18, fontSize: 28, lineHeight: 36, fontWeight: '600' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  statusCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusLabel: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  statusTitle: { marginTop: 4, fontSize: 22, lineHeight: 30, fontWeight: '700' },
  statusPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  statusPillText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  statusDesc: { marginTop: 12, fontSize: 14, lineHeight: 21 },
  statusTime: { marginTop: 8, fontSize: 12, lineHeight: 17 },
  panel: { marginTop: 18, borderRadius: 24, borderWidth: 1, padding: 18, gap: 18 },
  authRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  authCopy: { flex: 1 },
  authTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  authDesc: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  lockCard: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  lockText: { flex: 1, fontSize: 13, lineHeight: 18 },
  secondaryButton: {
    marginTop: 12,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
});
