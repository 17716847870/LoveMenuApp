import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BellRing, Heart, MoreHorizontal } from 'lucide-react-native';

import { PageHeaderBlock } from '../../components/PageHeaderBlock';
import { RootStackParamList, RootTabParamList } from '../../navigation/AppNavigator';
import { chatApi } from '../../services/chatApi';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { ChatMessageEntity, ChatSessionsSummary } from '../../types/chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Sessions'>,
  NativeStackScreenProps<RootStackParamList>
>;

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

function formatSessionTime(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function getMessagePreview(message?: ChatMessageEntity | null) {
  if (!message) {
    return '还没有聊天记录，发一句今天想吃什么吧。';
  }

  if (message.status === 'recalled') {
    return '这条消息已撤回';
  }

  if (message.mentions.length > 0) {
    return message.text_content ?? '[业务卡片]';
  }

  if (message.message_type === 'image') {
    return '[图片]';
  }

  if (message.message_type === 'voice') {
    return '[语音]';
  }

  return message.text_content ?? '[消息]';
}

export function SessionsScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const { partnerUser } = useAppStore();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<ChatSessionsSummary | null>(null);

  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.4) : theme.colors.cardBorder;
  const shadowColor = withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.12);
  const softSurface = theme.dark ? withAlpha(theme.colors.surfaceAlt, 0.92) : theme.colors.surface;
  const conversation = summary?.conversation ?? null;
  const chatUnread = conversation?.unread_count ?? 0;
  const partnerPresence = summary?.partner_presence ?? null;

  const loadSessions = useCallback(async () => {
    try {
      await phaseOneApi.touchPresence().catch(() => undefined);
      const { data } = await chatApi.getSessions();
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    const unsubscribe = navigation.addListener('focus', () => {
      void loadSessions();
    });
    return unsubscribe;
  }, [loadSessions, navigation]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <PageHeaderBlock
        title="消息"
        subtitle="我们的专属空间"
        titleColor={theme.colors.primary}
        subtitleColor={theme.colors.textSoft}
        style={{ marginLeft: 24, marginTop: insets.top }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[
            styles.partnerCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor,
              shadowColor,
            },
          ]}
          onPress={() => {
            navigation.navigate('Chat');
          }}
        >
          <View
            pointerEvents="none"
            style={[styles.partnerGlow, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.36) }]}
          />
          <View style={styles.partnerMedia}>
            <View style={styles.partnerAvatarWrap}>
              {partnerUser?.avatar_url ? (
                <Image source={{ uri: partnerUser.avatar_url }} style={styles.partnerAvatar} />
              ) : null}
            </View>
            <View style={[styles.onlineDot, !partnerPresence?.is_online ? styles.offlineDot : null]} />
          </View>
          <View style={styles.partnerBody}>
            <View style={styles.partnerTopRow}>
              <Text style={[styles.partnerName, { color: theme.colors.text }]} numberOfLines={1}>
                {partnerUser?.nickname ?? '另一半'} ❤️
              </Text>
              <View style={styles.partnerMetaWrap}>
                <Text style={[styles.partnerTime, { color: theme.colors.primary }]}>
                  {formatSessionTime(conversation?.last_message_at)}
                </Text>
                <Text style={[styles.partnerStatus, { color: theme.colors.textSoft }]}>
                  {partnerPresence?.label ?? '离线'}
                </Text>
              </View>
            </View>
            <View style={styles.partnerBottomRow}>
              <Text
                style={[
                  styles.partnerPreview,
                  { color: chatUnread > 0 ? theme.colors.text : theme.colors.textMuted },
                  chatUnread > 0 ? styles.unreadPreview : null,
                ]}
                numberOfLines={1}
              >
                {getMessagePreview(conversation?.last_message)}
              </Text>
              {chatUnread > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.badgeText}>{chatUnread}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>

        <View style={styles.dividerWrap}>
          <View style={[styles.dividerLine, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.45) }]} />
          <MoreHorizontal size={14} color={theme.colors.textSoft} strokeWidth={2.1} />
          <View style={[styles.dividerLine, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.45) }]} />
        </View>

        {(summary?.secondary_sessions ?? []).map((session) => {
          const unread = session.unread_count;
          const Icon = session.icon === 'bell' ? BellRing : Heart;

          return (
            <Pressable
              key={session.id}
              style={[
                styles.secondaryCard,
                {
                  backgroundColor: softSurface,
                  borderColor: withAlpha(theme.colors.cardBorder, unread > 0 ? 0.42 : 0.24),
                  opacity: unread > 0 ? 1 : 0.82,
                },
              ]}
              onPress={() => {
                navigation.navigate(session.route);
              }}
            >
              <View
                style={[
                  styles.secondaryIconWrap,
                  {
                    backgroundColor: unread > 0 ? theme.colors.secondarySoft : withAlpha(theme.colors.surfaceAlt, 0.95),
                  },
                ]}
              >
                <Icon size={20} color={unread > 0 ? theme.colors.primary : theme.colors.textSoft} strokeWidth={2.1} />
              </View>
              <View style={styles.secondaryBody}>
                <View style={styles.secondaryTopRow}>
                  <Text style={[styles.secondaryTitle, { color: theme.colors.text }]}>{session.title}</Text>
                  <Text style={[styles.secondaryMeta, { color: theme.colors.textSoft }]}>{session.meta}</Text>
                </View>
                <View style={styles.secondaryBottomRow}>
                  <Text
                    style={[
                      styles.secondaryPreview,
                      { color: unread > 0 ? theme.colors.text : theme.colors.textSoft },
                      unread > 0 ? styles.unreadPreview : null,
                    ]}
                    numberOfLines={1}
                  >
                    {session.preview}
                  </Text>
                  {unread > 0 ? (
                    <View style={[styles.smallBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.badgeText}>{unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingTop: 5,
    paddingHorizontal: 24,
    paddingBottom: 132,
  },
  partnerCard: {
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 6,
  },
  partnerGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  partnerMedia: {
    position: 'relative',
  },
  partnerAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  partnerAvatar: {
    width: '100%',
    height: '100%',
  },
  onlineDot: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  offlineDot: {
    backgroundColor: '#cbd5e1',
  },
  partnerBody: {
    flex: 1,
  },
  partnerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
    gap: 8,
  },
  partnerName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  partnerTime: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  partnerMetaWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  partnerStatus: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  partnerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerPreview: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  unreadPreview: {
    fontWeight: '700',
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  smallBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noticeBody: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  noticePreview: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  dividerWrap: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: 0.6,
  },
  dividerLine: {
    width: 48,
    height: 1,
  },
  secondaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  secondaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBody: {
    flex: 1,
  },
  secondaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  secondaryTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  secondaryMeta: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  secondaryPreview: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
