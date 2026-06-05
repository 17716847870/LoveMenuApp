import { ReactNode, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { CalendarDays, ChevronRight, X } from 'lucide-react-native';

import { DateBottomSheetPicker } from '../../components/DateBottomSheetPicker';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { uploadApi } from '../../services/uploadApi';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'PostToSpace'>;

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

type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function formatDisplayDate(date: Date) {
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isToday) {
    return '今天';
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function PostToSpaceScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [recordDate, setRecordDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canAddImage = images.length < 9;
  const publishDisabled = submitting || (!content.trim() && images.length === 0);
  const imageUploadPayload = useMemo(
    () => images.map((image) => ({ uri: image.uri, fileName: image.fileName, mimeType: image.mimeType })),
    [images],
  );

  async function handlePickImages() {
    if (!canAddImage) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('无法选择图片', '请先允许访问相册后再添加照片。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 9 - images.length,
      quality: 0.82,
    });

    if (result.canceled) {
      return;
    }

    const pickedImages = result.assets
      .map((asset) => ({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType }))
      .filter((asset) => Boolean(asset.uri));
    setImages((items) => [...items, ...pickedImages].slice(0, 9));
  }

  function handleRemoveImage(uri: string) {
    setImages((items) => items.filter((item) => item.uri !== uri));
  }

  async function handlePublish() {
    if (publishDisabled) {
      return;
    }

    try {
      setSubmitting(true);
      const uploadedImages = await Promise.all(imageUploadPayload.map((image) => uploadApi.uploadImage(image)));
      await phaseOneApi.createSpacePost({
        content_text: content.trim() || null,
        images: uploadedImages.map((result) => ({ image_url: result.data.object_key })),
        record_date: recordDate.toISOString(),
      });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Timeline');
      }
    } catch (error) {
      Alert.alert('发布失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="发布动态" subtitle="记录这一刻的甜蜜" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          placeholder="记录这一刻的甜蜜..."
          placeholderTextColor={theme.colors.textSoft}
          style={[styles.editor, { color: theme.colors.text }]}
        />

        <View style={styles.grid}>
          {images.map((image) => (
            <Pressable
              key={image.uri}
              style={[styles.mediaTile, { borderColor: withAlpha(theme.colors.cardBorder, 0.38) }]}
              onPress={() => navigation.navigate('ImagePreview', { imageUri: image.uri })}
            >
              <Image source={{ uri: image.uri }} style={styles.mediaImage} />
              <Pressable style={styles.closeBadge} onPress={() => handleRemoveImage(image.uri)} hitSlop={8}>
                <X size={14} color="#ffffff" strokeWidth={2.4} />
              </Pressable>
            </Pressable>
          ))}

          {canAddImage ? (
            <Pressable
              style={[styles.addTile, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.textSoft }]}
              onPress={handlePickImages}
            >
              <Text style={[styles.addPlus, { color: theme.colors.primary }]}>+</Text>
              <Text style={[styles.addLabel, { color: theme.colors.textMuted }]}>添加照片</Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={[
            styles.optionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: withAlpha(theme.colors.cardBorder, 0.38),
              shadowColor: withAlpha(theme.colors.primary, 0.08),
            },
          ]}
        >
          <OptionRow
            icon={<CalendarDays size={16} color={theme.colors.primary} strokeWidth={2.2} />}
            label="记录日期"
            value={formatDisplayDate(recordDate)}
            onPress={() => setShowDatePicker(true)}
            last
          />
        </View>

        <RomanticGradientButton
          title={submitting ? '发布中...' : '发布'}
          icon={<ChevronRight size={18} color="#ffffff" strokeWidth={2.2} />}
          disabled={publishDisabled}
          onPress={handlePublish}
        />
      </ScrollView>

      <DateBottomSheetPicker
        visible={showDatePicker}
        value={recordDate}
        title="记录日期"
        onClose={() => setShowDatePicker(false)}
        onConfirm={setRecordDate}
      />
    </View>
  );
}

function OptionRow({
  icon,
  label,
  value,
  last,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  last?: boolean;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      style={[
        styles.optionRow,
        !last ? { borderBottomWidth: 1, borderBottomColor: withAlpha(theme.colors.cardBorder, 0.25) } : null,
      ]}
      onPress={onPress}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.optionIconWrap, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.75) }]}>
          {icon}
        </View>
        <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{label}</Text>
      </View>
      <View style={styles.optionRight}>
        {value ? <Text style={[styles.optionValue, { color: theme.colors.textSoft }]}>{value}</Text> : null}
        <ChevronRight size={16} color={theme.colors.textSoft} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingTop: 18,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  editor: {
    minHeight: 156,
    fontSize: 16,
    lineHeight: 26,
    textAlignVertical: 'top',
    padding: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  closeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  addPlus: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '400',
  },
  addLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  optionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  optionRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  optionValue: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
});
