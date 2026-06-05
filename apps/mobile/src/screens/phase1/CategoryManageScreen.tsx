import { useEffect, useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowDown, ArrowUp, Info, Pencil, Plus, Trash2, X, FolderHeart, Sparkles, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDialogSheet, useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { MenuCategoryEntity } from '../../types/phaseOne';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryManage'>;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}



export function CategoryManageScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, relationship, menuCategories, menus, loadBootstrap } = useAppStore();
  const [name, setName] = useState('');
  const [editingCategory, setEditingCategory] = useState<MenuCategoryEntity | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);

  const [localCategories, setLocalCategories] = useState<MenuCategoryEntity[]>([]);

  useEffect(() => {
    setLocalCategories([...menuCategories].sort((a, b) => a.sort_order - b.sort_order));
  }, [menuCategories]);

  const closeComposer = () => {
    setComposerVisible(false);
    setEditingCategory(null);
    setName('');
  };

  const refreshCategories = async () => {
    if (!currentUser) return;
    await loadBootstrap(currentUser.id);
  };

  const handleSave = async () => {
    if (!name.trim() || !currentUser || !relationship) return;

    if (editingCategory) {
      await phaseOneApi.updateMenuCategory(editingCategory.id, { name: name.trim() });
      await refreshCategories();
      dialog.alert('保存成功', '分类名称已更新');
      closeComposer();
      return;
    }

    await phaseOneApi.createMenuCategory({
      name: name.trim(),
      sort_order: menuCategories.length + 1,
      status: 'active',
    });

    await refreshCategories();
    dialog.alert('创建成功', '分类已添加');
    closeComposer();
  };

  const persistCategoryOrder = async (nextCategories: MenuCategoryEntity[]) => {
    await Promise.all(
      nextCategories.map((category, index) =>
        phaseOneApi.updateMenuCategory(category.id, {
          sort_order: index + 1,
        }),
      ),
    );
    await refreshCategories();
  };

  const moveCategory = async (categoryId: number, direction: 'up' | 'down') => {
    const currentIndex = localCategories.findIndex((item) => item.id === categoryId);
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= localCategories.length) return;

    const nextCategories = [...localCategories];
    const [targetCategory] = nextCategories.splice(currentIndex, 1);
    nextCategories.splice(nextIndex, 0, targetCategory);

    // Using react-native-reanimated layout transitions for smoothness
    setLocalCategories(nextCategories);

    // Persist in background
    await persistCategoryOrder(nextCategories);
  };

  const requestDeleteCategory = (category: MenuCategoryEntity, dishesCount: number) => {
    if (!currentUser) return;
    if (dishesCount > 0) {
      dialog.alert('无法删除分类', `「${category.name}」下面还有 ${dishesCount} 道菜品，请先移动或删除这些菜品。`);
      return;
    }
    dialog.confirm({
      title: '删除分类？',
      message: `确定删除「${category.name}」吗？删除后不可恢复。`,
      actions: [
        { text: '取消', style: 'cancel' },
        {
          text: '确认删除',
          style: 'destructive',
          onPress: async () => {
            await phaseOneApi.deleteMenuCategory(category.id);
            await refreshCategories();
            dialog.alert('删除成功', '分类已删除');
          },
        },
      ],
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="分类管理" subtitle="维护菜单分组和显示状态" onBack={() => navigation.goBack()} />

      <View style={styles.floatingDecoTopRight} pointerEvents="none">
        <Heart size={80} color={withAlpha(theme.colors.primary, 0.15)} fill={withAlpha(theme.colors.primary, 0.15)} strokeWidth={0} />
        <View style={{ position: 'absolute', right: 40, top: 40 }}>
          <Heart size={40} color={withAlpha(theme.colors.primary, 0.2)} fill={withAlpha(theme.colors.primary, 0.2)} strokeWidth={0} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {localCategories.map((item, index) => {
            const dishesCount = menus.filter((menu) => menu.category_id === item.id && menu.status === 'active').length;
            const inactive = item.status !== 'active';

            return (
              <Animated.View
                key={item.id}
                layout={LinearTransition.springify().damping(18).mass(0.9)}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: withAlpha(theme.colors.cardBorder, 0.4),
                    shadowColor: withAlpha(theme.colors.primary, 0.08),
                    opacity: inactive ? 0.62 : 1,
                  },
                ]}
              >
                <View style={styles.sortActions}>
                  <Pressable
                    disabled={index === 0}
                    style={[
                      styles.sortButton,
                      {
                        backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.8),
                        opacity: index === 0 ? 0.36 : 1,
                      },
                    ]}
                    onPress={() => moveCategory(item.id, 'up')}
                  >
                    <ArrowUp size={15} color={theme.colors.textMuted} strokeWidth={2.5} />
                  </Pressable>
                  <Pressable
                    disabled={index === localCategories.length - 1}
                    style={[
                      styles.sortButton,
                      {
                        backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.8),
                        opacity: index === localCategories.length - 1 ? 0.36 : 1,
                      },
                    ]}
                    onPress={() => moveCategory(item.id, 'down')}
                  >
                    <ArrowDown size={15} color={theme.colors.textMuted} strokeWidth={2.5} />
                  </Pressable>
                </View>

                <View style={[styles.iconWrap, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.3) }]}>
                  <FolderHeart size={20} color={theme.colors.primary} strokeWidth={2} />
                </View>

                <View style={styles.categoryMeta}>
                  <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.categoryHint, { color: theme.colors.textSoft }]}>
                    {dishesCount} 道菜品{inactive ? ' · 已隐藏' : ''}
                  </Text>
                </View>

                <View style={styles.categoryActions}>
                  <Pressable
                    style={[styles.actionIconButton, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.4) }]}
                    onPress={() => {
                      setEditingCategory(item);
                      setName(item.name);
                      setComposerVisible(true);
                    }}
                  >
                    <Pencil size={16} color={theme.colors.secondary} strokeWidth={2.4} />
                  </Pressable>
                  <Pressable
                    style={[styles.actionIconButton, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.3) }]}
                    onPress={() => requestDeleteCategory(item, dishesCount)}
                  >
                    <Trash2 size={16} color={theme.colors.danger} strokeWidth={2.4} />
                  </Pressable>
                </View>
                </Animated.View>
            );
          })}
        </View>

        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.6),
              borderColor: withAlpha(theme.colors.primarySoft, 0.5),
            },
          ]}
        >
          <Sparkles size={16} color={theme.colors.primary} strokeWidth={2.2} />
          <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>点击左侧箭头，即可拖动调整顺序</Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footerAction,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 12,
            backgroundColor: withAlpha(theme.colors.background, 0.94),
          },
        ]}
      >
        <RomanticGradientButton
          title="新增分类"
          onPress={() => {
            setEditingCategory(null);
            setName('');
            setComposerVisible(true);
          }}
          icon={<Plus size={18} color="#ffffff" strokeWidth={2.2} />}
        />
      </View>

      <AppDialogSheet visible={composerVisible} onClose={closeComposer}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {editingCategory ? '编辑分类' : '新增分类'}
          </Text>
          <Pressable
            style={[styles.modalCloseButton, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.3) }]}
            onPress={closeComposer}
          >
            <X size={18} color={theme.colors.primary} strokeWidth={2.1} />
          </Pressable>
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="输入分类名称"
          placeholderTextColor={theme.colors.textSoft}
          style={[
            styles.input,
            {
              backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.7),
              borderColor: withAlpha(theme.colors.cardBorder, 0.7),
              color: theme.colors.text,
            },
          ]}
        />

        <RomanticGradientButton
          title={editingCategory ? '保存分类' : '确认新增'}
          onPress={handleSave}
          icon={<Plus size={18} color="#ffffff" strokeWidth={2.2} />}
        />
      </AppDialogSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  floatingDecoTopRight: {
    position: 'absolute',
    top: -20,
    right: -20,
    zIndex: 0,
  },
  infoBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  infoText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  list: { gap: 14 },
  categoryCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMeta: { flex: 1, gap: 4 },
  categoryTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  categoryHint: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  sortActions: { gap: 6 },
  sortButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerAction: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    fontWeight: '600',
  },
});
