import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AudioModule,
  AudioPlayer,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CirclePlus,
  Heart,
  ImagePlus,
  Mic,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  Send,
  SmilePlus,
  Trash2,
  Utensils,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { quickChatEmojis } from '../../constants/chatEmojiData';
import { chatApi, SendChatMessagePayload, subscribeToChatEvents } from '../../services/chatApi';
import { phaseOneApi } from '../../services/phaseOneApi';
import { uploadApi } from '../../services/uploadApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { ChatMessageEntity, ChatReplySnapshot } from '../../types/chat';
import { MenuEntity, MenuRequestEntity, OrderEntity } from '../../types/phaseOne';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

type ChatMessageType = 'text' | 'voice' | 'emoji' | 'image' | 'business';
type ChatSender = 'me' | 'partner';
type ChatStatus = 'sending' | 'sent' | 'delivered' | 'failed' | 'read' | 'recalled';
type BusinessMention = {
  refType: 'menu' | 'order' | 'wish';
  refId: number | string;
  title: string;
  subtitle: string;
  detail: string;
  footer: string;
};

type WishEntity = {
  id: number;
  title: string;
  subtitle: string;
  status: 'pending' | 'accepted' | 'rejected';
};

type ChatUiMessage = {
  id: string;
  sender: ChatSender;
  type: ChatMessageType;
  time: string;
  status: ChatStatus;
  text?: string;
  image?: string;
  voiceUri?: string;
  duration?: string;
  replyTo?: {
    id: string;
    senderLabel: string;
    summary: string;
  };
  mention?: BusinessMention;
};

const imageSeed =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBJxA8o_O1piNRg9oQzh8ZdudqGN-OlZ5955GhgGHn4s3RO-S9FgMd3ht7PX8K5f7uQpgo8RZ-ROqUq1lwBfZv8eEoNLj6UjTCU1CBMEfn9qoCgxeMUHuik9-nnHerPI4jj6HofXiKGz0ukopp2NmOn8Hus2TmmuYmFfu1H_4K_78Tt0VqQfTdvgS9FoVhu7BivN2Xb0YGB2kxheNt3YrGAPKz6abjouRc2uBzUeEy-Gpnf7IyYydhChcchz2uuNeMt3rKoy_NOz-w';

const maxVoiceRecordingMillis = 60000;
const emojiPanelHeight = 112;
const quickPanelHeight = 188;

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

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDurationFromMillis(durationMillis: number) {
  const totalSeconds = Math.max(1, Math.round(durationMillis / 1000));
  return formatDurationFromSeconds(totalSeconds);
}

function formatDurationFromSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function toWishEntity(request: MenuRequestEntity): WishEntity {
  return {
    id: request.id,
    title: request.title,
    subtitle: request.description || request.suggested_category_name || '来自心愿菜单',
    status: request.status,
  };
}

function parseDurationToSeconds(duration?: string) {
  if (!duration) {
    return 0;
  }

  const [minutes, seconds] = duration.split(':').map((item) => Number.parseInt(item, 10));
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return 0;
  }

  return minutes * 60 + seconds;
}

function orderStatusLabel(status: OrderEntity['status']) {
  switch (status) {
    case 'pending':
      return '待处理';
    case 'accepted':
      return '已接受';
    case 'rejected':
      return '已拒绝';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return '未知状态';
  }
}

function wishStatusLabel(status: WishEntity['status']) {
  switch (status) {
    case 'pending':
      return '待处理';
    case 'accepted':
      return '已接受';
    case 'rejected':
      return '已拒绝';
    default:
      return '未知状态';
  }
}

function messageSummary(message: ChatUiMessage) {
  if (message.status === 'recalled') {
    return '这条消息已撤回';
  }

  if (message.type === 'voice') {
    return `[语音] ${message.duration ?? ''}`;
  }

  if (message.type === 'image') {
    return '[图片]';
  }

  if (message.type === 'business') {
    return message.mention?.title ?? '[业务卡片]';
  }

  return message.text ?? '[消息]';
}

function statusLabel(status: ChatStatus) {
  switch (status) {
    case 'sending':
      return '发送中';
    case 'failed':
      return '发送失败';
    case 'read':
      return '已读';
    case 'delivered':
      return '已送达';
    case 'recalled':
      return '已撤回';
    default:
      return '已发送';
  }
}

function createReplySnapshot(message: ChatUiMessage, partnerName: string) {
  return {
    id: message.id,
    senderLabel: message.sender === 'me' ? '我' : partnerName,
    summary: messageSummary(message),
  };
}

export function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentUser, partnerUser, menus, orders, relationship } = useAppStore();
  const scrollRef = useRef<ScrollView>(null);
  const activePlayerRef = useRef<AudioPlayer | null>(null);
  const activePlayerSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const composerPanelProgress = useRef(new Animated.Value(0)).current;
  const orderSheetTranslateY = useRef(new Animated.Value(420)).current;
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<ChatUiMessage | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [isEmojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const [isQuickPanelOpen, setQuickPanelOpen] = useState(false);
  const [isComposerPanelMounted, setComposerPanelMounted] = useState(false);
  const [isOrderPickerVisible, setOrderPickerVisible] = useState(false);
  const [isOrderPickerMounted, setOrderPickerMounted] = useState(false);
  const [businessPickerMode, setBusinessPickerMode] = useState<'order' | 'menu' | 'wish'>('order');
  const [chatWishes, setChatWishes] = useState<WishEntity[]>([]);
  const [recordingPermissionGranted, setRecordingPermissionGranted] = useState(false);
  const [activeVoiceMessageId, setActiveVoiceMessageId] = useState<string | null>(null);
  const [playingVoiceMessageId, setPlayingVoiceMessageId] = useState<string | null>(null);
  const [voicePlayback, setVoicePlayback] = useState({ currentTime: 0, duration: 0 });
  const [partnerPresenceLabel, setPartnerPresenceLabel] = useState('离线');
  const hasReachedVoiceLimit = recorderState.isRecording && recorderState.durationMillis >= maxVoiceRecordingMillis;

  const partnerName = partnerUser?.nickname ?? '另一半';
  const topBorder = theme.dark ? withAlpha(theme.colors.cardBorder, 0.36) : theme.colors.cardBorder;
  const softSurface = theme.dark ? withAlpha(theme.colors.surfaceAlt, 0.92) : theme.colors.surface;
  const headerSurface = theme.dark ? theme.colors.card : theme.colors.surface;
  const panelSurface = theme.dark ? theme.colors.card : theme.colors.surface;
  const panelItemSurface = theme.dark ? theme.colors.surfaceAlt : theme.colors.surface;
  const activePanelHeight = isEmojiPanelOpen ? emojiPanelHeight : isQuickPanelOpen ? quickPanelHeight : 0;
  const inputBottomPadding = isEmojiPanelOpen || isQuickPanelOpen ? 16 : Math.max(insets.bottom + 16, 24);

  const buildMentionFromEntity = useCallback(
    (entity: ChatMessageEntity): BusinessMention | undefined => {
      const mention = entity.mentions[0];
      if (!mention) {
        return undefined;
      }

      if (mention.ref_type === 'order') {
        const order = orders.find((item) => item.id === mention.ref_id);
        return order
          ? buildOrderMention(order)
          : {
              refType: 'order',
              refId: mention.ref_id,
              title: entity.text_content ?? '订单详情',
              subtitle: `订单 ${mention.ref_id}`,
              detail: '这是一条订单引用',
              footer: '打开订单列表查看详情',
            };
      }

      if (mention.ref_type === 'menu') {
        const menu = menus.find((item) => item.id === mention.ref_id);
        return menu
          ? buildMenuMention(menu)
          : {
              refType: 'menu',
              refId: mention.ref_id,
              title: entity.text_content ?? '菜单详情',
              subtitle: '来自我们的专属菜单',
              detail: '这是一条菜单引用',
              footer: '打开菜单列表查看详情',
            };
      }

      return {
        refType: 'wish',
        refId: mention.ref_id,
        title: entity.text_content ?? '菜单心愿',
        subtitle: '来自菜单申请',
        detail: '这是一条心愿引用',
        footer: '可以一起确认要不要加入菜单',
      };
    },
    [menus, orders],
  );

  const buildReplySnapshotFromEntity = useCallback(
    (replyTo: ChatReplySnapshot | null) => {
      if (!replyTo) {
        return undefined;
      }

      return {
        id: String(replyTo.id),
        senderLabel: replyTo.sender_user_id === currentUser?.id ? '我' : partnerName,
        summary:
          replyTo.status === 'recalled'
            ? '这条消息已撤回'
            : replyTo.message_type === 'image'
              ? '[图片]'
              : replyTo.message_type === 'voice'
                ? '[语音]'
                : (replyTo.text_content ?? '[消息]'),
      };
    },
    [currentUser?.id, partnerName],
  );

  const mapChatMessage = useCallback(
    (entity: ChatMessageEntity): ChatUiMessage => {
      const asset = entity.assets[0];
      const mention = buildMentionFromEntity(entity);
      const messageType: ChatMessageType = mention ? 'business' : entity.message_type;

      return {
        id: String(entity.id),
        sender: entity.sender_user_id === currentUser?.id ? 'me' : 'partner',
        type: messageType,
        time: formatTime(new Date(entity.sent_at)),
        status: entity.status,
        text: entity.text_content ?? undefined,
        image: entity.message_type === 'image' ? asset?.asset_url : undefined,
        voiceUri: entity.message_type === 'voice' ? asset?.asset_url : undefined,
        duration:
          entity.message_type === 'voice' && asset?.duration_seconds
            ? formatDurationFromSeconds(asset.duration_seconds)
            : undefined,
        replyTo: buildReplySnapshotFromEntity(entity.reply_to_message),
        mention,
      };
    },
    [buildMentionFromEntity, buildReplySnapshotFromEntity, currentUser?.id],
  );

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!currentUser || relationship?.status !== 'active') {
        setMessages([]);
        return;
      }

      try {
        const [{ data }] = await Promise.all([chatApi.listMessages(), chatApi.markAsRead()]);
        setMessages(data.items.map(mapChatMessage));
      } catch {
        if (!options?.silent) {
          Alert.alert('加载失败', '暂时无法读取聊天记录，请稍后再试。');
        }
      }
    },
    [currentUser, mapChatMessage, relationship?.status],
  );

  const loadPartnerPresence = useCallback(async () => {
    if (!currentUser || relationship?.status !== 'active') {
      setPartnerPresenceLabel('等待完成绑定');
      return;
    }

    try {
      await phaseOneApi.touchPresence().catch(() => undefined);
      const { data } = await chatApi.getSessions();
      setPartnerPresenceLabel(data.partner_presence.label);
    } catch {
      setPartnerPresenceLabel('离线');
    }
  }, [currentUser, relationship?.status]);

  const applyRecalledMessage = useCallback((items: ChatUiMessage[], recalledMessage: ChatUiMessage) => {
    return items.map((item) => {
      const isRecalledMessage = item.id === recalledMessage.id;
      const nextItem = isRecalledMessage ? { ...recalledMessage, replyTo: undefined } : item;

      if (nextItem.replyTo?.id !== recalledMessage.id) {
        return nextItem;
      }

      return {
        ...nextItem,
        replyTo: undefined,
      };
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [activePanelHeight, messages.length, replyTarget?.id]);

  useEffect(() => {
    let unsubscribeStream: (() => void) | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isActive = false;

    const stopStream = () => {
      isActive = false;
      unsubscribeStream?.();
      unsubscribeStream = null;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const startStream = async () => {
      stopStream();
      isActive = true;
      void loadPartnerPresence();
      await loadMessages();
      unsubscribeStream = await subscribeToChatEvents(
        (event) => {
          if (event.type === 'message.created' || event.type === 'message.recalled') {
            const nextMessage = mapChatMessage(event.message);
            setMessages((items) => {
              const exists = items.some((item) => item.id === nextMessage.id);
              const nextItems = exists
                ? items.map((item) => (item.id === nextMessage.id ? nextMessage : item))
                : [...items, nextMessage];
              return event.type === 'message.recalled' ? applyRecalledMessage(nextItems, nextMessage) : nextItems;
            });

            if (event.message.receiver_user_id === currentUser?.id) {
              void chatApi.markAsRead();
            }
            return;
          }

          if (event.type === 'messages.read' && event.reader_user_id !== currentUser?.id) {
            setMessages((items) =>
              items.map((item) =>
                item.sender === 'me' && item.status === 'sent' ? { ...item, status: 'read' } : item,
              ),
            );
          }
        },
        () => {
          if (!isActive) {
            return;
          }
          reconnectTimer = setTimeout(() => {
            void startStream();
          }, 1500);
        },
      );
    };

    const unsubscribeFocus = navigation.addListener('focus', () => {
      void startStream();
    });
    const unsubscribeBlur = navigation.addListener('blur', stopStream);
    void startStream();

    return () => {
      stopStream();
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [currentUser?.id, loadMessages, loadPartnerPresence, mapChatMessage, navigation]);

  useEffect(() => {
    const visible = isEmojiPanelOpen || isQuickPanelOpen;

    if (visible) {
      setComposerPanelMounted(true);
      Animated.timing(composerPanelProgress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(composerPanelProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setComposerPanelMounted(false);
      }
    });
  }, [composerPanelProgress, isEmojiPanelOpen, isQuickPanelOpen]);

  useEffect(() => {
    if (isOrderPickerVisible) {
      if (businessPickerMode === 'wish') {
        void phaseOneApi
          .listMenuRequests()
          .then(({ data }) => setChatWishes(data.map(toWishEntity)))
          .catch(() => setChatWishes([]));
      }

      setOrderPickerMounted(true);
      orderSheetTranslateY.setValue(420);
      requestAnimationFrame(() => {
        Animated.timing(orderSheetTranslateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    Animated.timing(orderSheetTranslateY, {
      toValue: 420,
      duration: 190,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setOrderPickerMounted(false);
      }
    });
  }, [businessPickerMode, isOrderPickerVisible, orderSheetTranslateY]);

  useEffect(() => {
    let mounted = true;

    async function prepareAudio() {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!mounted) {
        return;
      }

      setRecordingPermissionGranted(status.granted);
      if (status.granted) {
        await setIsAudioActiveAsync(true);
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'doNotMix',
        });
      }
    }

    prepareAudio();
    return () => {
      mounted = false;
      activePlayerSubscriptionRef.current?.remove();
      activePlayerRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!hasReachedVoiceLimit) {
      return;
    }

    handleStopRecording(true);
  }, [hasReachedVoiceLimit]);

  async function sendOutgoingMessage(
    message: Omit<ChatUiMessage, 'id' | 'sender' | 'time' | 'status' | 'replyTo'>,
    payload?: SendChatMessagePayload,
  ) {
    const id = `local-${Date.now()}`;
    const nextMessage: ChatUiMessage = {
      ...message,
      id,
      sender: 'me',
      time: formatTime(),
      status: 'sending',
      replyTo: replyTarget ? createReplySnapshot(replyTarget, partnerName) : undefined,
    };

    setMessages((items) => [...items, nextMessage]);
    setReplyTarget(null);
    setActionTargetId(null);
    setEmojiPanelOpen(false);
    setQuickPanelOpen(false);

    if (!payload) {
      setTimeout(() => {
        setMessages((items) => items.map((item) => (item.id === id ? { ...item, status: 'sent' } : item)));
      }, 520);
      return;
    }

    try {
      const { data } = await chatApi.sendMessage(payload);
      const savedMessage = mapChatMessage(data);
      setMessages((items) => {
        const withoutDuplicate = items.filter((item) => item.id !== savedMessage.id);
        return withoutDuplicate.map((item) => (item.id === id ? savedMessage : item));
      });
    } catch {
      setMessages((items) => items.map((item) => (item.id === id ? { ...item, status: 'failed' } : item)));
      Alert.alert('发送失败', '消息暂时没有发出去，请稍后再试。');
    }
  }

  function handleSendText(text = draft) {
    const content = text.trim();
    if (!content) {
      return;
    }

    const replyToId = replyTarget?.id && /^\d+$/.test(replyTarget.id) ? Number(replyTarget.id) : null;
    void sendOutgoingMessage(
      { type: 'text', text: content },
      {
        message_type: 'text',
        text_content: content,
        reply_to_message_id: replyToId,
      },
    );
    setDraft('');
  }

  function handleSendEmoji(value: string) {
    const isEmojiOnly = value.length <= 4;
    const replyToId = replyTarget?.id && /^\d+$/.test(replyTarget.id) ? Number(replyTarget.id) : null;
    void sendOutgoingMessage(
      { type: isEmojiOnly ? 'emoji' : 'text', text: value },
      {
        message_type: isEmojiOnly ? 'emoji' : 'text',
        text_content: value,
        reply_to_message_id: replyToId,
      },
    );
  }

  function toggleComposerPanel(panel: 'emoji' | 'quick') {
    const nextEmojiOpen = panel === 'emoji' ? !isEmojiPanelOpen : false;
    const nextQuickOpen = panel === 'quick' ? !isQuickPanelOpen : false;

    setEmojiPanelOpen(nextEmojiOpen);
    setQuickPanelOpen(nextQuickOpen);
  }

  function openBusinessPicker(mode: 'order' | 'menu' | 'wish') {
    setBusinessPickerMode(mode);
    setQuickPanelOpen(false);
    setEmojiPanelOpen(false);
    setOrderPickerVisible(true);
  }

  function closeOrderPicker() {
    setOrderPickerVisible(false);
  }

  function handleSelectOrder(order: OrderEntity) {
    handleSendBusinessCard(buildOrderMention(order));
    closeOrderPicker();
  }

  function handleSelectMenu(menu: MenuEntity) {
    handleSendBusinessCard(buildMenuMention(menu));
    closeOrderPicker();
  }

  function handleSelectWish(wish: WishEntity) {
    handleSendBusinessCard(buildWishMention(wish));
    closeOrderPicker();
  }

  async function handleStartRecording() {
    if (!recordingPermissionGranted) {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setRecordingPermissionGranted(status.granted);
      if (!status.granted) {
        Alert.alert('无法录音', '需要开启麦克风权限后才能发送语音。');
        return;
      }
    }

    try {
      setEmojiPanelOpen(false);
      setQuickPanelOpen(false);
      setDraft('');
      await setIsAudioActiveAsync(true);
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record({ forDuration: maxVoiceRecordingMillis / 1000 });
    } catch {
      Alert.alert('录音失败', '当前设备暂时无法开始录音，请稍后再试。');
    }
  }

  async function handleStopRecording(shouldSend = true) {
    try {
      await audioRecorder.stop();
      await setIsAudioActiveAsync(true);
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      if (!shouldSend) {
        return;
      }

      const stoppedState = audioRecorder.getStatus();
      const uri = audioRecorder.uri ?? stoppedState.url ?? recorderState.url;
      if (!uri) {
        Alert.alert('录音失败', '没有拿到录音文件，请重新录一次。');
        return;
      }

      const durationMillis = stoppedState.durationMillis || recorderState.durationMillis;
      const durationSeconds = Math.max(1, Math.round(durationMillis / 1000));
      const replyToId = replyTarget?.id && /^\d+$/.test(replyTarget.id) ? Number(replyTarget.id) : null;
      const { data, fileSize } = await uploadApi.uploadAudio({
        uri,
        fileName: `lovemenu-voice-${Date.now()}.m4a`,
        mimeType: 'audio/mp4',
      });
      await sendOutgoingMessage(
        {
          type: 'voice',
          voiceUri: data.url,
          duration: formatDurationFromSeconds(durationSeconds),
        },
        {
          message_type: 'voice',
          reply_to_message_id: replyToId,
          asset: {
            asset_type: 'voice',
            asset_url: data.url,
            duration_seconds: durationSeconds,
            file_size: fileSize,
          },
        },
      );
    } catch {
      Alert.alert('语音发送失败', '语音没有成功上传或发送，请重新录一次。');
    }
  }

  async function handlePlayVoice(message: ChatUiMessage) {
    if (!message.voiceUri) {
      Alert.alert('暂无音频', '这条语音没有可播放的音频文件，请重新录制后再试。');
      return;
    }

    try {
      await setIsAudioActiveAsync(true);
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      if (playingVoiceMessageId === message.id && activePlayerRef.current?.playing) {
        activePlayerRef.current.pause();
        setPlayingVoiceMessageId(null);
        setVoicePlayback({
          currentTime: activePlayerRef.current.currentTime,
          duration: activePlayerRef.current.duration,
        });
        return;
      }

      if (activeVoiceMessageId === message.id && activePlayerRef.current) {
        setPlayingVoiceMessageId(message.id);
        activePlayerRef.current.play();
        return;
      }

      activePlayerSubscriptionRef.current?.remove();
      activePlayerRef.current?.remove();
      const player = createAudioPlayer(
        { uri: message.voiceUri },
        { keepAudioSessionActive: true, updateInterval: 100 },
      );
      player.volume = 1;
      const messageDuration = parseDurationToSeconds(message.duration);
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        setVoicePlayback({
          currentTime: status.currentTime,
          duration: status.duration || messageDuration,
        });

        if (status.didJustFinish) {
          setActiveVoiceMessageId(null);
          setPlayingVoiceMessageId(null);
          setVoicePlayback({ currentTime: 0, duration: status.duration });
          return;
        }

        if (status.playing) {
          setPlayingVoiceMessageId(message.id);
        }
      });

      activePlayerSubscriptionRef.current = subscription;
      activePlayerRef.current = player;
      setActiveVoiceMessageId(message.id);
      setPlayingVoiceMessageId(message.id);
      setVoicePlayback({ currentTime: 0, duration: messageDuration });
      await player.seekTo(0);
      setTimeout(() => player.play(), 60);
    } catch {
      setPlayingVoiceMessageId(null);
      setVoicePlayback({ currentTime: 0, duration: 0 });
      Alert.alert('播放失败', '这条语音暂时无法播放，请重新录制后再试。');
    }
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.82,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const image = result.assets[0];
      const replyToId = replyTarget?.id && /^\d+$/.test(replyTarget.id) ? Number(replyTarget.id) : null;
      try {
        const { data } = await uploadApi.uploadImage({
          uri: image.uri,
          fileName: image.fileName,
          mimeType: image.mimeType,
        });
        await sendOutgoingMessage(
          { type: 'image', image: data.url },
          {
            message_type: 'image',
            reply_to_message_id: replyToId,
            asset: {
              asset_type: 'image',
              asset_url: data.url,
              width: image.width ?? null,
              height: image.height ?? null,
            },
          },
        );
      } catch {
        Alert.alert('图片发送失败', '图片暂时没有上传成功，请稍后再试。');
      }
    }
  }

  function handleSendBusinessCard(mention: BusinessMention) {
    const replyToId = replyTarget?.id && /^\d+$/.test(replyTarget.id) ? Number(replyTarget.id) : null;
    void sendOutgoingMessage(
      { type: 'business', mention },
      {
        message_type: 'text',
        text_content: mention.title,
        reply_to_message_id: replyToId,
        mention: {
          ref_type: mention.refType,
          ref_id: Number(mention.refId),
        },
      },
    );
  }

  function handleRecall(messageId: string) {
    if (/^\d+$/.test(messageId)) {
      void chatApi
        .recallMessage(Number(messageId))
        .then(({ data }) => {
          const recalledMessage = mapChatMessage(data);
          setMessages((items) => applyRecalledMessage(items, recalledMessage));
        })
        .catch(() => Alert.alert('撤回失败', '这条消息暂时不能撤回，请稍后再试。'));
      setActionTargetId(null);
      return;
    }

    setMessages((items) =>
      applyRecalledMessage(items, {
        ...(items.find((item) => item.id === messageId) ?? {
          id: messageId,
          sender: 'me',
          type: 'text',
          time: formatTime(),
        }),
        status: 'recalled',
        text: undefined,
        image: undefined,
        duration: undefined,
        mention: undefined,
      }),
    );
    setActionTargetId(null);
  }

  function handleRetry(messageId: string) {
    setMessages((items) => items.map((item) => (item.id === messageId ? { ...item, status: 'sending' } : item)));
    setActionTargetId(null);
    setTimeout(() => {
      setMessages((items) => items.map((item) => (item.id === messageId ? { ...item, status: 'sent' } : item)));
    }, 520);
  }

  function buildOrderMention(order: OrderEntity): BusinessMention {
    const menu = menus.find((item) => item.id === order.menu_id);
    return {
      refType: 'order',
      refId: order.id,
      title: menu?.title ?? '订单详情',
      subtitle: `订单号 ${order.order_no}`,
      detail: `当前状态：${orderStatusLabel(order.status)} · 数量 ${order.deducted_count}`,
      footer: order.user_remark ? `备注：${order.user_remark}` : '点击查看这份订单的处理进度',
    };
  }

  function buildMenuMention(menu: MenuEntity): BusinessMention {
    return {
      refType: 'menu',
      refId: menu.id,
      title: menu.title,
      subtitle: menu.description ?? '来自我们的专属菜单',
      detail: `${menu.is_published ? '已上架' : '未上架'} · 剩余 ${menu.available_count} 次 · 热度 ${menu.heat_score}`,
      footer: menu.remark ? `备注：${menu.remark}` : `已完成 ${menu.completed_order_count} 次`,
    };
  }

  function buildWishMention(wish: WishEntity): BusinessMention {
    return {
      refType: 'wish',
      refId: wish.id,
      title: wish.title,
      subtitle: wish.subtitle,
      detail: `心愿状态：${wishStatusLabel(wish.status)}`,
      footer: '可以一起确认要不要加入菜单',
    };
  }

  function renderBusinessCard(mention: BusinessMention, isMine: boolean) {
    return (
      <View
        style={[
          styles.businessCard,
          {
            backgroundColor: isMine ? withAlpha(theme.colors.primarySoft, 0.76) : softSurface,
            borderColor: isMine ? theme.colors.cardBorder : withAlpha(theme.colors.cardBorder, 0.5),
          },
        ]}
      >
        <View style={[styles.businessIcon, { backgroundColor: theme.colors.primary }]}>
          {mention.refType === 'menu' ? (
            <Utensils size={16} color="#ffffff" strokeWidth={2.2} />
          ) : mention.refType === 'wish' ? (
            <Heart size={16} color="#ffffff" fill="#ffffff" strokeWidth={2.2} />
          ) : (
            <PackageCheck size={16} color="#ffffff" strokeWidth={2.2} />
          )}
        </View>
        <View style={styles.businessBody}>
          <Text style={[styles.businessTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {mention.title}
          </Text>
          <Text style={[styles.businessSubtitle, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {mention.subtitle}
          </Text>
          <Text style={[styles.businessDetail, { color: theme.colors.text }]} numberOfLines={2}>
            {mention.detail}
          </Text>
          <View style={[styles.businessDivider, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.46) }]} />
          <Text style={[styles.businessFooter, { color: theme.colors.textSoft }]} numberOfLines={2}>
            {mention.footer}
          </Text>
        </View>
      </View>
    );
  }

  function renderMessageContent(message: ChatUiMessage, isMine: boolean) {
    if (message.status === 'recalled') {
      return (
        <View style={[styles.recalledBubble, { backgroundColor: softSurface }]}>
          <Text style={[styles.recalledText, { color: theme.colors.textSoft }]}>这条消息已撤回</Text>
        </View>
      );
    }

    if (message.type === 'voice') {
      const isPlaying = playingVoiceMessageId === message.id;
      const fallbackDuration = parseDurationToSeconds(message.duration);
      const activeDuration = voicePlayback.duration || fallbackDuration;
      const playbackProgress =
        isPlaying && activeDuration > 0 ? Math.min(1, Math.max(0, voicePlayback.currentTime / activeDuration)) : 0;
      const durationLabel = isPlaying
        ? `${formatDurationFromSeconds(voicePlayback.currentTime)} / ${formatDurationFromSeconds(activeDuration)}`
        : message.duration;

      return (
        <View
          style={[
            styles.voiceBubble,
            {
              backgroundColor: isMine ? theme.colors.primarySoft : softSurface,
              borderColor: isMine ? theme.colors.cardBorder : withAlpha(theme.colors.cardBorder, 0.5),
              borderBottomLeftRadius: isMine ? 18 : 8,
              borderBottomRightRadius: isMine ? 8 : 18,
            },
          ]}
        >
          <Pressable
            style={[styles.playButton, { backgroundColor: isPlaying ? theme.colors.danger : theme.colors.primary }]}
            onPress={() => handlePlayVoice(message)}
          >
            {isPlaying ? (
              <Pause size={16} color="#ffffff" fill="#ffffff" strokeWidth={2.2} />
            ) : (
              <Play size={16} color="#ffffff" fill="#ffffff" strokeWidth={2.2} />
            )}
          </Pressable>
          <View style={styles.voiceBars}>
            {[8, 16, 24, 14, 20, 8, 12, 8].map((height, barIndex) => (
              <View
                key={`${message.id}-${barIndex}`}
                style={[
                  styles.voiceBar,
                  {
                    height,
                    backgroundColor:
                      playbackProgress >= (barIndex + 1) / 8 || barIndex === 2 || barIndex === 3
                        ? theme.colors.primary
                        : theme.colors.textSoft,
                    opacity: isPlaying && playbackProgress < (barIndex + 1) / 8 ? 0.42 : 1,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.voiceDuration, { color: isPlaying ? theme.colors.primary : theme.colors.textMuted }]}>
            {durationLabel}
          </Text>
        </View>
      );
    }

    if (message.type === 'image' && message.image) {
      return (
        <Pressable
          style={[
            styles.imageBubble,
            { borderColor: isMine ? theme.colors.cardBorder : withAlpha(theme.colors.cardBorder, 0.5) },
          ]}
          onPress={() => navigation.navigate('ImagePreview', { imageUri: message.image! })}
        >
          <Image source={{ uri: message.image }} style={styles.imageBubbleMedia} />
        </Pressable>
      );
    }

    if (message.type === 'business' && message.mention) {
      return renderBusinessCard(message.mention, isMine);
    }

    return (
      <View
        style={[
          message.type === 'emoji' ? styles.emojiBubble : styles.textBubble,
          isMine
            ? {
                backgroundColor: message.type === 'emoji' ? 'transparent' : theme.colors.primarySoft,
                borderColor: message.type === 'emoji' ? 'transparent' : theme.colors.cardBorder,
                borderBottomRightRadius: 8,
              }
            : {
                backgroundColor: message.type === 'emoji' ? 'transparent' : softSurface,
                borderColor: message.type === 'emoji' ? 'transparent' : withAlpha(theme.colors.cardBorder, 0.5),
                borderBottomLeftRadius: 8,
              },
        ]}
      >
        <Text
          style={[
            message.type === 'emoji' ? styles.emojiText : styles.messageText,
            { color: isMine ? theme.colors.badgeText : theme.colors.text },
          ]}
        >
          {message.text}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: headerSurface,
            borderBottomColor: withAlpha(topBorder, 0.7),
            shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.12),
          },
        ]}
      >
        <View style={styles.headerInner}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color={theme.colors.primary} strokeWidth={2.4} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <View style={[styles.headerAvatar, { borderColor: withAlpha(theme.colors.primarySoft, 0.7) }]}>
              {partnerUser?.avatar_url ? (
                <Image source={{ uri: partnerUser.avatar_url }} style={styles.fillImage} />
              ) : null}
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.brandTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {partnerName}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSoft }]} numberOfLines={1}>
                {relationship?.status === 'active' ? `专属聊天 · ${partnerPresenceLabel}` : '等待完成绑定'}
              </Text>
            </View>
          </View>
          <View style={styles.headerIconPlaceholder} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 88, paddingBottom: Math.max(insets.bottom + 154 + activePanelHeight, 186) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.datePillWrap}>
          <Text style={[styles.datePill, { color: theme.colors.textSoft, backgroundColor: softSurface }]}>
            今天 09:42
          </Text>
        </View>

        {messages.map((message, index) => {
          const isMine = message.sender === 'me';
          const partnerAvatarSource = partnerUser?.avatar_url ?? null;
          const currentAvatarSource = currentUser?.avatar_url ?? null;
          const showActionBar = actionTargetId === message.id && message.status !== 'recalled';

          return (
            <View key={message.id}>
              {index === 3 ? (
                <View style={[styles.datePillWrap, styles.midDate]}>
                  <Text style={[styles.datePill, { color: theme.colors.textSoft, backgroundColor: softSurface }]}>
                    11:30
                  </Text>
                </View>
              ) : null}

              <View style={[styles.messageRow, isMine ? styles.messageRowRight : null]}>
                {!isMine ? (
                  <View style={[styles.bubbleAvatar, { borderColor: withAlpha(theme.colors.cardBorder, 0.7) }]}>
                    {partnerAvatarSource ? (
                      <Image source={{ uri: partnerAvatarSource }} style={styles.fillImage} />
                    ) : null}
                  </View>
                ) : null}

                <View style={[styles.messageStack, isMine ? styles.messageStackRight : null]}>
                  {message.replyTo ? (
                    <View
                      style={[
                        styles.replyPreview,
                        {
                          backgroundColor: withAlpha(theme.colors.surfaceAlt, theme.dark ? 0.66 : 0.84),
                          borderLeftColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <Text style={[styles.replyAuthor, { color: theme.colors.primary }]} numberOfLines={1}>
                        {message.replyTo.senderLabel}
                      </Text>
                      <Text style={[styles.replySummary, { color: theme.colors.textMuted }]} numberOfLines={1}>
                        {message.replyTo.summary}
                      </Text>
                    </View>
                  ) : null}

                  <Pressable onLongPress={() => setActionTargetId(message.id)}>
                    {renderMessageContent(message, isMine)}
                  </Pressable>

                  <View style={[styles.metaRow, isMine ? styles.metaRowRight : null]}>
                    <Text style={[styles.messageTime, { color: theme.colors.textSoft }]}>{message.time}</Text>
                    {isMine ? (
                      <Text
                        style={[
                          styles.messageStatus,
                          { color: message.status === 'failed' ? theme.colors.danger : theme.colors.textSoft },
                        ]}
                      >
                        {statusLabel(message.status)}
                      </Text>
                    ) : null}
                  </View>

                  {showActionBar ? (
                    <View
                      style={[
                        styles.messageActions,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: withAlpha(theme.colors.cardBorder, 0.62),
                        },
                      ]}
                    >
                      <Pressable
                        style={styles.messageActionButton}
                        onPress={() => {
                          setReplyTarget(message);
                          setActionTargetId(null);
                        }}
                      >
                        <RotateCcw size={14} color={theme.colors.primary} strokeWidth={2.1} />
                        <Text style={[styles.messageActionText, { color: theme.colors.primary }]}>引用</Text>
                      </Pressable>
                      {isMine ? (
                        <Pressable style={styles.messageActionButton} onPress={() => handleRecall(message.id)}>
                          <Trash2 size={14} color={theme.colors.danger} strokeWidth={2.1} />
                          <Text style={[styles.messageActionText, { color: theme.colors.danger }]}>撤回</Text>
                        </Pressable>
                      ) : null}
                      {message.status === 'failed' ? (
                        <Pressable style={styles.messageActionButton} onPress={() => handleRetry(message.id)}>
                          <Send size={14} color={theme.colors.primary} strokeWidth={2.1} />
                          <Text style={[styles.messageActionText, { color: theme.colors.primary }]}>重发</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                {isMine ? (
                  <View style={[styles.bubbleAvatar, { borderColor: withAlpha(theme.colors.cardBorder, 0.7) }]}>
                    {currentAvatarSource ? (
                      <Image source={{ uri: currentAvatarSource }} style={styles.fillImage} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.composerBar,
          {
            paddingBottom: inputBottomPadding,
            backgroundColor: panelSurface,
            borderTopColor: withAlpha(theme.colors.cardBorder, 0.45),
          },
        ]}
      >
        {replyTarget ? (
          <View
            style={[
              styles.replyComposer,
              { backgroundColor: softSurface, borderColor: withAlpha(theme.colors.cardBorder, 0.5) },
            ]}
          >
            <View style={styles.replyComposerBody}>
              <Text style={[styles.replyAuthor, { color: theme.colors.primary }]} numberOfLines={1}>
                引用 {replyTarget.sender === 'me' ? '我' : partnerName}
              </Text>
              <Text style={[styles.replySummary, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {messageSummary(replyTarget)}
              </Text>
            </View>
            <Pressable style={styles.closeReplyButton} onPress={() => setReplyTarget(null)}>
              <X size={16} color={theme.colors.textSoft} strokeWidth={2.2} />
            </Pressable>
          </View>
        ) : null}

        {recorderState.isRecording ? (
          <View
            style={[
              styles.recordingComposer,
              { backgroundColor: softSurface, borderColor: withAlpha(theme.colors.cardBorder, 0.5) },
            ]}
          >
            <View style={[styles.recordingDot, { backgroundColor: theme.colors.danger }]} />
            <View style={styles.recordingBody}>
              <Text style={[styles.recordingTitle, { color: theme.colors.text }]}>正在录音</Text>
              <Text style={[styles.recordingTime, { color: theme.colors.primary }]}>
                {formatDurationFromMillis(Math.min(recorderState.durationMillis, maxVoiceRecordingMillis))}
              </Text>
            </View>
            <View style={styles.recordingBars}>
              {[8, 16, 24, 14, 20].map((height, index) => (
                <View
                  key={`recording-${index}`}
                  style={[
                    styles.recordingBar,
                    {
                      height,
                      backgroundColor: index % 2 === 0 ? theme.colors.primary : theme.colors.primarySoft,
                    },
                  ]}
                />
              ))}
            </View>
            <Pressable style={styles.closeReplyButton} onPress={() => handleStopRecording(false)}>
              <X size={16} color={theme.colors.textSoft} strokeWidth={2.2} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composerRow}>
          <Pressable onPress={() => toggleComposerPanel('quick')}>
            <CirclePlus
              size={22}
              color={isQuickPanelOpen ? theme.colors.primary : theme.colors.textSoft}
              strokeWidth={2.1}
            />
          </Pressable>
          <Pressable onPress={() => toggleComposerPanel('emoji')}>
            <SmilePlus
              size={22}
              color={isEmojiPanelOpen ? theme.colors.primary : theme.colors.textSoft}
              strokeWidth={2.1}
            />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="给亲爱的发消息..."
            placeholderTextColor={theme.colors.textSoft}
            style={[
              styles.composerInput,
              {
                backgroundColor: softSurface,
                borderColor: withAlpha(theme.colors.cardBorder, theme.dark ? 0.56 : 0.78),
                color: theme.colors.text,
              },
            ]}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => handleSendText()}
          />
          {draft.trim() ? (
            <Pressable
              style={[styles.micButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleSendText()}
            >
              <Send size={18} color="#ffffff" strokeWidth={2.3} />
            </Pressable>
          ) : recorderState.isRecording ? (
            <Pressable
              style={[styles.micButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleStopRecording(true)}
            >
              <Send size={18} color="#ffffff" strokeWidth={2.3} />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.micButton, { backgroundColor: theme.colors.primarySoft }]}
              onPress={handleStartRecording}
            >
              <Mic size={18} color={theme.colors.primary} strokeWidth={2.3} />
            </Pressable>
          )}
        </View>

        {isComposerPanelMounted ? (
          <Animated.View
            style={[
              styles.composerPanel,
              {
                opacity: composerPanelProgress,
                transform: [
                  {
                    translateY: composerPanelProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {isEmojiPanelOpen ? (
              <View style={[styles.emojiPanel, { minHeight: emojiPanelHeight, backgroundColor: panelSurface }]}>
                {quickChatEmojis.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={[styles.emojiOption, { backgroundColor: panelItemSurface }]}
                    onPress={() => handleSendEmoji(emoji)}
                  >
                    <Text style={[styles.emojiOptionText, { color: theme.colors.text }]}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {isQuickPanelOpen ? (
              <View style={[styles.quickPanel, { minHeight: quickPanelHeight, backgroundColor: panelSurface }]}>
                <Pressable
                  style={[styles.quickAction, { backgroundColor: panelItemSurface }]}
                  onPress={handlePickImage}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primarySoft }]}>
                    <ImagePlus size={18} color={theme.colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.colors.text }]}>图片</Text>
                </Pressable>
                <Pressable
                  style={[styles.quickAction, { backgroundColor: panelItemSurface }]}
                  onPress={() => openBusinessPicker('order')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primarySoft }]}>
                    <PackageCheck size={18} color={theme.colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.colors.text }]}>订单</Text>
                </Pressable>
                <Pressable
                  style={[styles.quickAction, { backgroundColor: panelItemSurface }]}
                  onPress={() => openBusinessPicker('menu')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.secondarySoft }]}>
                    <Utensils size={18} color={theme.colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.colors.text }]}>菜单</Text>
                </Pressable>
                <Pressable
                  style={[styles.quickAction, { backgroundColor: panelItemSurface }]}
                  onPress={() => openBusinessPicker('wish')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.secondarySoft }]}>
                    <Heart size={18} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.colors.text }]}>心愿</Text>
                </Pressable>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>

      <Modal visible={isOrderPickerMounted} transparent animationType="none" onRequestClose={closeOrderPicker}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeOrderPicker} />
          <Animated.View
            style={[
              styles.orderSheet,
              {
                paddingBottom: Math.max(insets.bottom, 12) + 12,
                backgroundColor: theme.colors.surface,
                borderColor: withAlpha(theme.colors.cardBorder, 0.55),
                transform: [{ translateY: orderSheetTranslateY }],
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.orderSheetHeader}>
              <Text style={[styles.orderSheetTitle, { color: theme.colors.text }]}>
                {businessPickerMode === 'order'
                  ? '选择要发送的订单'
                  : businessPickerMode === 'menu'
                    ? '选择要发送的菜单'
                    : '选择要发送的心愿'}
              </Text>
              <Pressable hitSlop={10} onPress={closeOrderPicker}>
                <Text style={[styles.orderSheetClose, { color: theme.colors.textSoft }]}>取消</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.orderList} contentContainerStyle={styles.orderListContent}>
              {businessPickerMode === 'order'
                ? orders.map((order) => {
                    const menu = menus.find((item) => item.id === order.menu_id);
                    return (
                      <Pressable
                        key={order.id}
                        style={[
                          styles.orderOption,
                          { backgroundColor: softSurface, borderColor: withAlpha(theme.colors.cardBorder, 0.36) },
                        ]}
                        onPress={() => handleSelectOrder(order)}
                      >
                        <View style={[styles.orderOptionIcon, { backgroundColor: theme.colors.primarySoft }]}>
                          <PackageCheck size={18} color={theme.colors.primary} strokeWidth={2.2} />
                        </View>
                        <View style={styles.orderOptionBody}>
                          <Text style={[styles.orderOptionTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {menu?.title ?? `订单 ${order.order_no}`}
                          </Text>
                          <Text style={[styles.orderOptionMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                            订单号 {order.order_no} · {orderStatusLabel(order.status)} · 数量 {order.deducted_count}
                          </Text>
                          <Text style={[styles.orderOptionHint, { color: theme.colors.textSoft }]} numberOfLines={1}>
                            {order.user_remark ? `备注：${order.user_remark}` : '发送后可直接查看订单进度'}
                          </Text>
                        </View>
                        <Send size={16} color={theme.colors.primary} strokeWidth={2.2} />
                      </Pressable>
                    );
                  })
                : null}

              {businessPickerMode === 'menu'
                ? menus.map((menu) => (
                    <Pressable
                      key={menu.id}
                      style={[
                        styles.orderOption,
                        { backgroundColor: softSurface, borderColor: withAlpha(theme.colors.cardBorder, 0.36) },
                      ]}
                      onPress={() => handleSelectMenu(menu)}
                    >
                      <View style={[styles.orderOptionIcon, { backgroundColor: theme.colors.secondarySoft }]}>
                        <Utensils size={18} color={theme.colors.primary} strokeWidth={2.2} />
                      </View>
                      <View style={styles.orderOptionBody}>
                        <Text style={[styles.orderOptionTitle, { color: theme.colors.text }]} numberOfLines={1}>
                          {menu.title}
                        </Text>
                        <Text style={[styles.orderOptionMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                          {menu.is_published ? '已上架' : '未上架'} · 剩余 {menu.available_count} 次 · 热度{' '}
                          {menu.heat_score}
                        </Text>
                        <Text style={[styles.orderOptionHint, { color: theme.colors.textSoft }]} numberOfLines={1}>
                          {menu.remark ? `备注：${menu.remark}` : `已完成 ${menu.completed_order_count} 次`}
                        </Text>
                      </View>
                      <Send size={16} color={theme.colors.primary} strokeWidth={2.2} />
                    </Pressable>
                  ))
                : null}

              {businessPickerMode === 'wish'
                ? chatWishes.map((wish) => (
                    <Pressable
                      key={wish.id}
                      style={[
                        styles.orderOption,
                        { backgroundColor: softSurface, borderColor: withAlpha(theme.colors.cardBorder, 0.36) },
                      ]}
                      onPress={() => handleSelectWish(wish)}
                    >
                      <View style={[styles.orderOptionIcon, { backgroundColor: theme.colors.secondarySoft }]}>
                        <Heart size={18} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />
                      </View>
                      <View style={styles.orderOptionBody}>
                        <Text style={[styles.orderOptionTitle, { color: theme.colors.text }]} numberOfLines={1}>
                          {wish.title}
                        </Text>
                        <Text style={[styles.orderOptionMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                          {wish.subtitle} · {wishStatusLabel(wish.status)}
                        </Text>
                        <Text style={[styles.orderOptionHint, { color: theme.colors.textSoft }]} numberOfLines={1}>
                          可以发送给对方确认，之后加入菜单
                        </Text>
                      </View>
                      <Send size={16} color={theme.colors.primary} strokeWidth={2.2} />
                    </Pressable>
                  ))
                : null}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  headerInner: {
    height: 70,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconPlaceholder: {
    width: 36,
    height: 36,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerCopy: {
    maxWidth: 180,
  },
  brandTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  datePillWrap: {
    alignItems: 'center',
  },
  midDate: {
    marginTop: 10,
    marginBottom: 2,
  },
  datePill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  messageStack: {
    maxWidth: '76%',
    gap: 4,
  },
  messageStackRight: {
    alignItems: 'flex-end',
  },
  textBubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emojiBubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  emojiText: {
    fontSize: 34,
    lineHeight: 42,
  },
  recalledBubble: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  recalledText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 4,
  },
  metaRowRight: {
    marginLeft: 0,
    marginRight: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 10,
    lineHeight: 12,
  },
  messageStatus: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  replyPreview: {
    minWidth: 172,
    maxWidth: 244,
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  replyAuthor: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  replySummary: {
    fontSize: 12,
    lineHeight: 16,
  },
  voiceBubble: {
    width: 238,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBars: {
    flex: 1,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  voiceBar: {
    width: 4,
    borderRadius: 999,
  },
  voiceDuration: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  imageBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageBubbleMedia: {
    width: 220,
    height: 140,
  },
  businessCard: {
    width: 284,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  businessIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessBody: {
    flex: 1,
  },
  businessTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  businessSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  businessDetail: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  businessDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 7,
  },
  businessFooter: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  messageActions: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    gap: 10,
  },
  messageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageActionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  composerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  replyComposer: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  replyComposerBody: {
    flex: 1,
  },
  closeReplyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingComposer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingBody: {
    minWidth: 74,
  },
  recordingTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  recordingTime: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recordingBars: {
    flex: 1,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordingBar: {
    width: 5,
    borderRadius: 999,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 108,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerPanel: {
    overflow: 'hidden',
  },
  emojiPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 2,
  },
  emojiOption: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionText: {
    fontSize: 24,
    lineHeight: 28,
  },
  quickPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 2,
  },
  quickAction: {
    width: 76,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  quickActionWide: {
    flex: 1,
    minWidth: 152,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBody: {
    flex: 1,
  },
  quickActionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  quickActionMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 12, 20, 0.32)',
  },
  orderSheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 137, 154, 0.42)',
    marginBottom: 12,
  },
  orderSheetHeader: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderSheetTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  orderSheetClose: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  orderList: {
    marginTop: 8,
  },
  orderListContent: {
    gap: 10,
    paddingBottom: 12,
  },
  orderOption: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderOptionBody: {
    flex: 1,
  },
  orderOptionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  orderOptionMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  orderOptionHint: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
});
