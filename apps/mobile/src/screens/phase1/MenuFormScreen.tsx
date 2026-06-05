import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Camera, Heart, Minus, Plus, Tags } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { uploadApi } from '../../services/uploadApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'MenuForm'>;

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

export function MenuFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, relationship, menuCategories, menus, loadBootstrap } = useAppStore();
  const editingMenu = useMemo(
    () => menus.find((item) => item.id === route.params?.menuId),
    [menus, route.params?.menuId],
  );

  const [title, setTitle] = useState(editingMenu?.title ?? route.params?.initialTitle ?? '');
  const [description, setDescription] = useState(editingMenu?.description ?? route.params?.initialDescription ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(
    editingMenu?.cover_image_object_key ?? editingMenu?.cover_image_url ?? '',
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(editingMenu?.cover_image_url ?? '');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [remark, setRemark] = useState(editingMenu?.remark ?? route.params?.initialRemark ?? '');
  const [availableCount, setAvailableCount] = useState(Math.max(editingMenu?.available_count ?? 1, 1));
  const [categoryId, setCategoryId] = useState<number | null>(
    editingMenu?.category_id ?? menuCategories[0]?.id ?? null,
  );

  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.38) : '#f2d9d8';
  const softSurface = theme.dark ? withAlpha(theme.colors.surfaceAlt, 0.92) : withAlpha(theme.colors.surfaceAlt, 0.78);
  const glassSurface = theme.dark ? withAlpha(theme.colors.card, 0.34) : 'rgba(255,255,255,0.22)';
  const overlayText = '#ffffff';
  const heroSource = coverPreviewUrl?.trim() || editingMenu?.cover_image_url || '';

  const persistMenu = async (isPublished: boolean) => {
    if (!currentUser || !relationship || !categoryId || !title.trim()) {
      dialog.alert('还差一点', '请至少填写菜单名称并选择分类');
      return;
    }

    const payload = {
      category_id: categoryId,
      title: title.trim(),
      description: description.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
      is_published: isPublished,
      is_limited: true,
      available_count: availableCount,
      remark: remark.trim() || null,
    };

    let savedMenuId = editingMenu?.id;
    if (editingMenu) {
      const { data } = await phaseOneApi.updateMenu(editingMenu.id, payload);
      savedMenuId = data.id;
    } else {
      const { data } = await phaseOneApi.createMenu(payload);
      savedMenuId = data.id;
    }

    if (route.params?.sourceRequestId && savedMenuId) {
      await phaseOneApi.updateMenuRequestStatus(route.params.sourceRequestId, {
        status: 'accepted',
        create_menu: false,
        converted_menu_id: savedMenuId,
      });
    }

    await loadBootstrap(currentUser.id);
    dialog.alert(isPublished ? '保存成功' : '草稿已保存', isPublished ? '菜单已更新' : '可以稍后继续完善');
    if (route.params?.sourceRequestId) {
      navigation.pop(2);
    } else {
      navigation.goBack();
    }
  };

  const decrementCount = () => setAvailableCount((value) => Math.max(value - 1, 1));
  const incrementCount = () => setAvailableCount((value) => value + 1);

  const handlePickCover = async () => {
    if (isUploadingCover) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      dialog.alert('无法打开相册', '请先允许 LoveMenu 访问你的相册');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.88,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsUploadingCover(true);
    try {
      const asset = result.assets[0];
      const { data } = await uploadApi.uploadImage({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      setCoverImageUrl(data.object_key);
      setCoverPreviewUrl(data.url);
      dialog.alert('封面已更新', '图片已上传到云端');
    } catch {
      dialog.alert('上传失败', '请确认 OSS 配置可用后再试');
    } finally {
      setIsUploadingCover(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}>
        <View style={styles.overlayBar}>
          <Pressable
            style={[styles.overlayButton, { backgroundColor: glassSurface, borderColor: withAlpha('#ffffff', 0.32) }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color={overlayText} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            style={[styles.draftButton, { backgroundColor: glassSurface, borderColor: withAlpha('#ffffff', 0.3) }]}
            onPress={() => persistMenu(false)}
          >
            <Text style={[styles.draftButtonText, { color: overlayText }]}>保存草稿</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 140, 168) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Image source={{ uri: heroSource }} style={styles.heroImage} />
          <View style={styles.heroShade} />
          <Pressable
            style={[
              styles.coverAction,
              { backgroundColor: withAlpha('#ffffff', 0.28), borderColor: withAlpha('#ffffff', 0.5) },
            ]}
            disabled={isUploadingCover}
            onPress={handlePickCover}
          >
            {isUploadingCover ? (
              <ActivityIndicator color={overlayText} size="small" />
            ) : (
              <Camera size={28} color={overlayText} strokeWidth={2} />
            )}
            <Text style={[styles.coverActionText, { color: overlayText }]}>
              {isUploadingCover ? '上传中' : '更换封面'}
            </Text>
          </Pressable>
          <View
            pointerEvents="none"
            style={[
              styles.heroFade,
              {
                backgroundColor: theme.colors.background,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.canvas,
            {
              backgroundColor: theme.colors.background,
              shadowColor: withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.08),
            },
          ]}
        >
          <View style={styles.form}>
            <View style={styles.inputBlock}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="给这份美味起个名字..."
                placeholderTextColor={withAlpha(theme.colors.textSoft, 0.68)}
                style={[styles.titleInput, { color: theme.colors.text }]}
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="描述一下这份心意，让TA充满期待..."
                placeholderTextColor={withAlpha(theme.colors.textSoft, 0.68)}
                multiline
                style={[styles.descriptionInput, { color: theme.colors.textMuted }]}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.3) }]} />

            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Tags size={16} color={theme.colors.textMuted} strokeWidth={2.1} />
                <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>所属分类</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {menuCategories.map((item) => {
                  const active = categoryId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                          borderColor: active ? theme.colors.primarySoft : withAlpha(theme.colors.cardBorder, 0.5),
                        },
                      ]}
                      onPress={() => setCategoryId(item.id)}
                    >
                      <Text style={[styles.categoryText, { color: active ? theme.colors.primary : theme.colors.text }]}>
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.limitCard, { backgroundColor: softSurface, borderColor }]}>
              <View style={styles.limitCopy}>
                <Text style={[styles.limitTitle, { color: theme.colors.text }]}>每日供应限量</Text>
                <Text style={[styles.limitBody, { color: theme.colors.textMuted }]}>
                  物以稀为贵，限制份数增加期待感
                </Text>
              </View>
              <View
                style={[
                  styles.stepper,
                  { backgroundColor: theme.colors.surface, borderColor: withAlpha(theme.colors.cardBorder, 0.5) },
                ]}
              >
                <Pressable
                  style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceAlt }]}
                  onPress={decrementCount}
                >
                  <Minus size={18} color={theme.colors.textMuted} strokeWidth={2.3} />
                </Pressable>
                <Text style={[styles.stepperValue, { color: theme.colors.text }]}>{availableCount}</Text>
                <Pressable
                  style={[styles.stepperButton, { backgroundColor: theme.colors.primarySoft }]}
                  onPress={incrementCount}
                >
                  <Plus size={18} color={theme.colors.primary} strokeWidth={2.3} />
                </Pressable>
              </View>
            </View>

            <View style={styles.auxSection}>
              <TextInput
                value={remark}
                onChangeText={setRemark}
                placeholder="补充备注，例如：纪念日、忌口或惊喜提示..."
                placeholderTextColor={withAlpha(theme.colors.textSoft, 0.62)}
                style={[
                  styles.auxInput,
                  {
                    backgroundColor: softSurface,
                    borderColor,
                    color: theme.colors.text,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom + 16, 24),
            backgroundColor: theme.dark
              ? withAlpha(theme.colors.background, 0.96)
              : withAlpha(theme.colors.background, 0.94),
          },
        ]}
      >
        <RomanticGradientButton
          title={editingMenu ? '保存菜单更新' : '上架专属菜单'}
          onPress={() => persistMenu(true)}
          icon={<Heart size={18} color="#ffffff" fill="#ffffff" strokeWidth={2.2} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 16,
  },
  overlayBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  draftButton: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  draftButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.6,
  },
  heroSection: {
    height: 353,
    position: 'relative',
    backgroundColor: '#eae8e4',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  coverAction: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -72 }, { translateY: -36 }],
    width: 144,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  coverActionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 1.1,
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
    opacity: 0.92,
  },
  canvas: {
    marginTop: -40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
  },
  form: {
    paddingHorizontal: 24,
    gap: 32,
  },
  inputBlock: {
    gap: 12,
  },
  titleInput: {
    paddingVertical: 0,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.56,
  },
  descriptionInput: {
    minHeight: 80,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  separator: {
    height: 1,
  },
  section: {
    gap: 12,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.6,
  },
  categoryRow: {
    gap: 12,
    paddingRight: 24,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  limitCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  limitCopy: {
    flex: 1,
  },
  limitTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  limitBody: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    width: 18,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  auxSection: {
    marginTop: -8,
  },
  auxInput: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
