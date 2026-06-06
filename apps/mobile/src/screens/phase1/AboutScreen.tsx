import { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BadgeInfo, CheckCircle2, ChevronRight, Copyright, Mail, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDialogSheet, useAppDialog } from '../../components/AppDialog';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { AppAboutResponse, AppVersionCheckResponse } from '../../types/phaseOne';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;
const appLogo = require('../../../assets/icon.png');

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

function getCurrentVersion() {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function getCurrentBuildNumber() {
  return (
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '1'
  );
}

export function AboutScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const [about, setAbout] = useState<AppAboutResponse | null>(null);
  const [versionResult, setVersionResult] = useState<AppVersionCheckResponse | null>(null);
  const [versionSheetVisible, setVersionSheetVisible] = useState(false);
  const [loading, setLoading] = useState<'about' | 'version' | null>('about');
  const panelBorder = withAlpha(theme.colors.cardBorder, theme.dark ? 0.5 : 0.62);
  const shadowColor = withAlpha(theme.colors.primary, theme.dark ? 0.16 : 0.1);

  useEffect(() => {
    let mounted = true;

    phaseOneApi
      .getAppAbout()
      .then(({ data }) => {
        if (mounted) {
          setAbout(data);
        }
      })
      .catch((error) => {
        dialog.alert('加载失败', error instanceof Error ? error.message : '请稍后再试。');
      })
      .finally(() => {
        if (mounted) {
          setLoading(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [dialog]);

  const currentVersion = getCurrentVersion();
  const currentBuildNumber = getCurrentBuildNumber();

  const openUrl = (url?: string) => {
    if (!url) return;
    void Linking.openURL(url);
  };

  const handleCheckVersion = async () => {
    setLoading('version');
    try {
      const { data } = await phaseOneApi.checkAppVersion({
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        current_version: currentVersion,
        build_number: currentBuildNumber,
      });
      setVersionResult(data);
      setVersionSheetVisible(true);
    } catch (error) {
      dialog.alert('检查失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="关于我们" subtitle="了解 LoveMenu 和当前版本" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.brandCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor }]}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          <Text style={[styles.appName, { color: theme.colors.text }]}>{about?.app_name ?? 'LoveMenu'}</Text>
          <Text style={[styles.slogan, { color: theme.colors.textMuted }]}>
            {loading === 'about' ? '正在加载应用信息...' : about?.slogan}
          </Text>
          <View style={[styles.versionPill, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.5) }]}>
            <Text style={[styles.versionPillText, { color: theme.colors.primary }]}>当前版本 v{currentVersion}</Text>
          </View>
        </View>

        {about ? (
          <>
            <InfoCard title="应用简介" icon={BadgeInfo}>
              <Text style={[styles.paragraph, { color: theme.colors.textMuted }]}>{about.description}</Text>
            </InfoCard>

            <InfoCard title="主要功能" icon={CheckCircle2}>
              <View style={styles.featureList}>
                {about.features.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <View style={[styles.featureDot, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>
            </InfoCard>

            <InfoCard title="版本与协议" icon={ShieldCheck}>
              <ActionRow title="检查更新" value={`v${currentVersion}`} onPress={handleCheckVersion} loading={loading === 'version'} />
              {about.privacy_policy_url ? (
                <ActionRow title="隐私政策" value="查看" onPress={() => openUrl(about.privacy_policy_url)} />
              ) : null}
              {about.terms_url ? <ActionRow title="用户协议" value="查看" onPress={() => openUrl(about.terms_url)} /> : null}
            </InfoCard>

            <InfoCard title="联系我们" icon={Mail}>
              {about.contact_email ? <Text style={[styles.paragraph, { color: theme.colors.textMuted }]}>{about.contact_email}</Text> : null}
              {!about.contact_email ? <Text style={[styles.paragraph, { color: theme.colors.textMuted }]}>暂无联系方式</Text> : null}
            </InfoCard>

            <InfoCard title="版权信息" icon={Copyright}>
              <Text style={[styles.paragraph, { color: theme.colors.textMuted }]}>{about.company_name}</Text>
              <Text style={[styles.paragraph, { color: theme.colors.textMuted }]}>{about.copyright}</Text>
              {about.icp_record ? <Text style={[styles.recordText, { color: theme.colors.textSoft }]}>{about.icp_record}</Text> : null}
              {about.police_record ? <Text style={[styles.recordText, { color: theme.colors.textSoft }]}>{about.police_record}</Text> : null}
            </InfoCard>
          </>
        ) : null}
      </ScrollView>

      <AppDialogSheet visible={versionSheetVisible} onClose={() => setVersionSheetVisible(false)} style={styles.versionSheet}>
        <View style={styles.versionSheetHeader}>
          <Text style={[styles.versionSheetTitle, { color: theme.colors.text }]}>{versionResult?.title ?? '版本检查'}</Text>
          <Text style={[styles.versionSheetSubtitle, { color: theme.colors.textMuted }]}>
            {versionResult?.has_update
              ? `最新版本 v${versionResult.latest_version}`
              : `当前版本 v${currentVersion}`}
          </Text>
        </View>
        {versionResult?.release_notes?.length ? (
          <View style={styles.releaseNoteList}>
            {versionResult.release_notes.map((note) => (
              <View key={note} style={styles.featureRow}>
                <View style={[styles.featureDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.featureText, { color: theme.colors.text }]}>{note}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {versionResult?.has_update && (versionResult.store_url || versionResult.download_url) ? (
          <Pressable
            style={[styles.updateButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
            onPress={() => openUrl(versionResult.store_url || versionResult.download_url)}
          >
            <Text style={styles.updateButtonText}>{versionResult.force_update ? '立即更新' : '去更新'}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.updateButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
            onPress={() => setVersionSheetVisible(false)}
          >
            <Text style={styles.updateButtonText}>知道了</Text>
          </Pressable>
        )}
      </AppDialogSheet>
    </View>
  );

  function InfoCard({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    children: React.ReactNode;
  }) {
    return (
      <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder, shadowColor }]}>
        <View style={styles.infoHeader}>
          <View style={[styles.infoIcon, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.55) }]}>
            <Icon size={18} color={theme.colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>{title}</Text>
        </View>
        <View style={styles.infoBody}>{children}</View>
      </View>
    );
  }

  function ActionRow({
    title,
    value,
    onPress,
    loading: rowLoading,
  }: {
    title: string;
    value: string;
    onPress: () => void;
    loading?: boolean;
  }) {
    return (
      <Pressable style={({ pressed }) => [styles.actionRow, pressed ? { opacity: 0.72 } : null]} onPress={onPress}>
        <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{title}</Text>
        <View style={styles.actionRight}>
          {rowLoading ? <RefreshCw size={16} color={theme.colors.primary} strokeWidth={2.2} /> : null}
          <Text style={[styles.actionValue, { color: theme.colors.textMuted }]}>{rowLoading ? '检查中' : value}</Text>
          <ChevronRight size={17} color={theme.colors.textSoft} strokeWidth={2.2} />
        </View>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  brandCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 22,
  },
  appName: {
    marginTop: 14,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
  },
  slogan: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  versionPill: {
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  versionPillText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  infoBody: {
    marginTop: 14,
    gap: 10,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  actionRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  recordText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  versionSheet: {
    width: '92%',
    maxWidth: 430,
  },
  versionSheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  versionSheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  versionSheetSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  releaseNoteList: {
    gap: 8,
  },
  updateButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
});
