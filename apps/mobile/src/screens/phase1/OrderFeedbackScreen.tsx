import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Heart, ImagePlus, Send, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { uploadApi } from '../../services/uploadApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderFeedback'>;
type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
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

export function OrderFeedbackScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { orders, menus } = useAppStore();
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const order = useMemo(() => {
    if (route.params?.orderId) {
      return orders.find((item) => item.id === route.params?.orderId) ?? null;
    }
    return orders.find((item) => item.status === 'completed') ?? orders[0] ?? null;
  }, [orders, route.params?.orderId]);
  const menu = order ? menus.find((item) => item.id === order.menu_id) : null;
  const canAddImage = images.length < 3;
  const submitDisabled = submitting || !order || (!note.trim() && images.length === 0);

  async function handlePickImages() {
    if (!canAddImage) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('无法选择图片', '请先允许访问相册后再上传反馈照片。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.82,
    });

    if (result.canceled) {
      return;
    }

    const pickedImages = result.assets
      .map((asset) => ({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType }))
      .filter((asset) => Boolean(asset.uri));
    setImages((items) => [...items, ...pickedImages].slice(0, 3));
  }

  function handleRemoveImage(uri: string) {
    setImages((items) => items.filter((item) => item.uri !== uri));
  }

  async function handleSubmitFeedback() {
    if (!order || submitDisabled) {
      return;
    }

    try {
      setSubmitting(true);
      const uploadedImages = await Promise.all(images.map((image) => uploadApi.uploadImage(image)));
      await phaseOneApi.createOrderFeedback(order.id, {
        content_text: note.trim() || null,
        images: uploadedImages.map((result) => ({ image_url: result.data.object_key })),
      });
      await useAppStore.getState().loadBootstrap();
      navigation.replace('Timeline');
    } catch (error) {
      Alert.alert('发布失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="评价本次时光" subtitle="记录你们的专属浪漫" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 128, 152) }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: withAlpha(theme.colors.cardBorder, 0.7),
              shadowColor: withAlpha(theme.colors.primary, 0.1),
            },
          ]}
        >
          <View style={[styles.summaryGlow, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.3) }]} />
          <Image
            source={{
              uri:
                menu?.cover_image_url ??
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBrpINe4mLHX6NUFK67ff2r-6Y1GNb49f5g4jCJS_ENF5sNE2yfIkRqkkcw9dhHtcwdkNl1BdBbQcyhJ9KUtHqhP8RfbxdgtCJIur3NlCewmxQpmrSfhB-YizPIgiwAuifY8mtKhCTql2_gtL5iv0niuAdtgVC6uStAhz_KeQO546lUCp2IYTtp150ghWFlVjDjUBvPEfuRvgBSM321U_kD3KV0EmW2lqRKtJthLOw-jbI4NY6LMi1676ZaRChbmdnDPVUOQLg7aTU',
            }}
            style={styles.summaryImage}
          />
          <View style={styles.summaryBody}>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {menu?.title ?? '塞纳河畔·双人法式轻奢套餐'}
            </Text>
            <Text style={[styles.summaryMeta, { color: theme.colors.textMuted }]}>今天 19:30 · 订单已完成</Text>
          </View>
          <View style={[styles.doneDot, { backgroundColor: theme.colors.secondarySoft }]}>
            <Send size={16} color={theme.colors.primary} strokeWidth={2.2} />
          </View>
        </View>

        <View
          style={[
            styles.rateCard,
            { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.45) },
          ]}
        >
          <Text style={[styles.rateLabel, { color: theme.colors.textMuted }]}>浪漫指数</Text>
          <View style={styles.heartRow}>
            {Array.from({ length: 5 }).map((_, index) => {
              const active = index < rating;
              return (
                <Pressable key={index} onPress={() => setRating(index + 1)}>
                  <Heart
                    size={34}
                    color={active ? theme.colors.primary : withAlpha(theme.colors.cardBorder, 0.8)}
                    fill={active ? theme.colors.primary : 'transparent'}
                    strokeWidth={2}
                  />
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.rateHint, { color: theme.colors.primary }]}>非常完美，令人心动</Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>定格瞬间</Text>
          {images.length > 0 ? (
            <View style={styles.feedbackImageGrid}>
              {images.map((image) => (
                <Pressable
                  key={image.uri}
                  style={styles.feedbackImageTile}
                  onPress={() => navigation.navigate('ImagePreview', { imageUri: image.uri })}
                >
                  <Image source={{ uri: image.uri }} style={styles.feedbackImage} />
                  <Pressable
                    style={[styles.removeImageButton, { backgroundColor: withAlpha(theme.colors.text, 0.72) }]}
                    onPress={() => handleRemoveImage(image.uri)}
                    hitSlop={8}
                  >
                    <X size={14} color="#ffffff" strokeWidth={2.4} />
                  </Pressable>
                </Pressable>
              ))}
              {canAddImage ? (
                <Pressable
                  style={[
                    styles.addImageTile,
                    { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.85) },
                  ]}
                  onPress={handlePickImages}
                >
                  <ImagePlus size={20} color={theme.colors.primary} strokeWidth={2.2} />
                  <Text style={[styles.addImageText, { color: theme.colors.textSoft }]}>继续添加</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Pressable
              style={[
                styles.uploadBox,
                { backgroundColor: theme.colors.surfaceAlt, borderColor: withAlpha(theme.colors.cardBorder, 0.85) },
              ]}
              onPress={handlePickImages}
            >
              <View
                style={[
                  styles.uploadIcon,
                  { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.8) },
                ]}
              >
                <Camera size={18} color={theme.colors.primary} strokeWidth={2.1} />
              </View>
              <Text style={[styles.uploadText, { color: theme.colors.textSoft }]}>上传美食或合照记录甜蜜</Text>
              <Text style={[styles.uploadHint, { color: theme.colors.textSoft }]}>最多 3 张</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>心情日记</Text>
          <View style={[styles.textAreaWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
              placeholder="这顿饭感觉如何？环境氛围喜欢吗？分享一下你们的体验吧..."
              placeholderTextColor={theme.colors.textSoft}
              style={[styles.textArea, { color: theme.colors.text }]}
            />
            <Text style={[styles.counter, { color: theme.colors.textSoft }]}>{note.length} / 200</Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.fixedActionBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.colors.background,
            borderTopColor: withAlpha(theme.colors.cardBorder, 0.45),
          },
        ]}
      >
        <RomanticGradientButton
          title={submitting ? '发布中...' : '发布到时光轴'}
          icon={<Send size={18} color="#ffffff" strokeWidth={2.2} />}
          disabled={submitDisabled}
          onPress={handleSubmitFeedback}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  headerBlock: {
    alignItems: 'center',
    gap: 6,
  },
  heading: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  summaryGlow: {
    position: 'absolute',
    top: -20,
    left: -16,
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  summaryImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  summaryBody: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  summaryMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  doneDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateCard: {
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
  rateLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heartRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rateHint: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    paddingLeft: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  uploadBox: {
    height: 128,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  uploadText: {
    fontSize: 14,
    lineHeight: 20,
  },
  uploadHint: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  feedbackImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  feedbackImageTile: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
  },
  feedbackImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageTile: {
    width: 96,
    height: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addImageText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  textAreaWrap: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  textArea: {
    minHeight: 112,
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 10,
    fontSize: 10,
    lineHeight: 12,
  },
  fixedActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
