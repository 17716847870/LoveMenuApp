import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Flame, Plus, Search, Sparkles, ThumbsUp, UtensilsCrossed } from 'lucide-react-native';

import { PageHeaderBlock } from '../../components/PageHeaderBlock';
import { RootStackParamList, RootTabParamList } from '../../navigation/AppNavigator';
import { useAppStore } from '../../store/appStore';
import { MenuEntity } from '../../types/phaseOne';
import { useAppTheme } from '../../theme/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Menu'>,
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

type MenuSection = {
  id: number | 'uncategorized';
  title: string;
  items: MenuEntity[];
};

export function MenuListScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { previewRole, menuCategories, menus, loadBootstrap } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageOffset = useRef(new Animated.Value(0)).current;

  const refreshMenus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadBootstrap();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBootstrap]);

  useEffect(() => {
    Animated.spring(pageOffset, {
      toValue: isRefreshing ? 28 : 0,
      useNativeDriver: true,
      tension: 90,
      friction: 12,
    }).start();
  }, [isRefreshing, pageOffset]);

  const visibleMenus = useMemo(
    () => (previewRole === 'publisher' ? menus : menus.filter((item) => item.is_published)),
    [menus, previewRole],
  );

  const filteredMenus = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return visibleMenus;
    }

    return visibleMenus.filter((item) => {
      const haystack = `${item.title} ${item.description ?? ''} ${item.remark ?? ''}`.toLowerCase();
      return haystack.includes(normalizedKeyword);
    });
  }, [keyword, visibleMenus]);

  const sections = useMemo(() => {
    const sortedCategories = [...menuCategories].sort((a, b) => a.sort_order - b.sort_order);
    const grouped: MenuSection[] = sortedCategories
      .map((category) => ({
        id: category.id,
        title: category.name,
        items: filteredMenus.filter((item) => item.category_id === category.id),
      }))
      .filter((section) => section.items.length > 0);

    const uncategorized = filteredMenus.filter((item) => item.category_id == null);
    if (uncategorized.length > 0) {
      grouped.push({
        id: 'uncategorized',
        title: '未分类',
        items: uncategorized,
      });
    }

    return grouped;
  }, [filteredMenus, menuCategories]);

  const [activeCategoryId, setActiveCategoryId] = useState<number | 'uncategorized' | null>(sections[0]?.id ?? null);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeCategoryId) ?? sections[0] ?? null,
    [activeCategoryId, sections],
  );
  const isSearching = keyword.trim().length > 0;
  const emptyTitle = isSearching
    ? '没有找到这道心动菜单'
    : previewRole === 'publisher'
      ? '还没有菜单'
      : '菜单正在准备中';
  const emptyText = isSearching
    ? '换个关键词试试，或者看看其他分类里有没有灵感。'
    : previewRole === 'publisher'
      ? '先创建一道菜，把今天想给对方的心意放进菜单里。'
      : '可以先发起一个心愿，让主厨知道你今天想吃什么。';
  const emptyActionLabel = isSearching ? '清空搜索' : previewRole === 'publisher' ? '创建菜单' : '发起心愿';
  const handleEmptyAction = () => {
    if (isSearching) {
      setKeyword('');
      return;
    }

    if (previewRole === 'publisher') {
      navigation.navigate('MenuForm', {});
      return;
    }

    navigation.navigate('CreateApplication');
  };

  useFocusEffect(
    useCallback(() => {
      void loadBootstrap().catch(() => undefined);
    }, [loadBootstrap]),
  );

  const panelBorder = theme.dark ? withAlpha(theme.colors.cardBorder, 0.36) : theme.colors.cardBorder;
  const panelShadow = withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.08);
  const categorySurface = theme.dark
    ? withAlpha(theme.colors.surfaceAlt, 0.82)
    : withAlpha(theme.colors.surfaceAlt, 0.72);
  const searchSurface = theme.dark
    ? withAlpha(theme.colors.surfaceAlt, 0.92)
    : withAlpha(theme.colors.surfaceAlt, 0.82);
  const mutedText = theme.dark ? theme.colors.textMuted : '#8c8fa4';
  const softPink = theme.dark ? withAlpha(theme.colors.primarySoft, 0.24) : withAlpha(theme.colors.primarySoft, 0.5);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.canvas, { paddingTop: insets.top }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshMenus}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <Animated.View style={{ transform: [{ translateY: pageOffset }] }}>
          <PageHeaderBlock
            title="菜单"
            subtitle="今天想吃点什么"
            titleColor={theme.colors.primary}
            subtitleColor={theme.colors.textSoft}
          />

          <View style={[styles.searchBar, { backgroundColor: searchSurface, borderColor: theme.colors.cardBorder }]}>
            <Search size={18} color={mutedText} strokeWidth={2.1} />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="搜索你想吃的..."
              placeholderTextColor={mutedText}
              style={[styles.searchInput, { color: theme.colors.text }]}
            />
          </View>

          {previewRole === 'publisher' ? (
            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.actionPill,
                  { backgroundColor: softPink, borderColor: withAlpha(theme.colors.primarySoft, 0.45) },
                ]}
                onPress={() => navigation.navigate('CategoryManage')}
              >
                <Text style={[styles.actionPillText, { color: theme.colors.primary }]}>管理分类</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionPill,
                  { backgroundColor: softPink, borderColor: withAlpha(theme.colors.primarySoft, 0.45) },
                ]}
                onPress={() => navigation.navigate('MenuForm', {})}
              >
                <Text style={[styles.actionPillText, { color: theme.colors.primary }]}>创建菜单</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionPill,
                  { backgroundColor: softPink, borderColor: withAlpha(theme.colors.primarySoft, 0.45) },
                ]}
                onPress={() => navigation.navigate('ApplicationList')}
              >
                <Text style={[styles.actionPillText, { color: theme.colors.primary }]}>心愿申请</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.actionPill,
                  { backgroundColor: softPink, borderColor: withAlpha(theme.colors.primarySoft, 0.45) },
                ]}
                onPress={() => navigation.navigate('CreateApplication')}
              >
                <Text style={[styles.actionPillText, { color: theme.colors.primary }]}>发起心愿</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionPill,
                  { backgroundColor: softPink, borderColor: withAlpha(theme.colors.primarySoft, 0.45) },
                ]}
                onPress={() => navigation.navigate('ApplicationList')}
              >
                <Text style={[styles.actionPillText, { color: theme.colors.primary }]}>我的心愿</Text>
              </Pressable>
            </View>
          )}

          <View style={[styles.contentRow, sections.length === 0 ? styles.contentRowEmpty : null]}>
            {sections.length > 0 ? (
              <ScrollView
                style={styles.categoryRailScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.categoryRail}
              >
                {sections.map((section) => {
                  const active = section.id === activeSection?.id;
                  return (
                    <Pressable
                      key={String(section.id)}
                      style={[
                        styles.categoryButton,
                        {
                          backgroundColor: active ? softPink : 'transparent',
                        },
                      ]}
                      onPress={() => setActiveCategoryId(section.id)}
                    >
                      <Text style={[styles.categoryText, { color: active ? theme.colors.primary : mutedText }]}>
                        {section.title}
                      </Text>
                      {active ? (
                        <View style={[styles.categoryIndicator, { backgroundColor: theme.colors.primary }]} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <View style={styles.menuPanel}>
              <View style={styles.menuColumn}>
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>
                  {activeSection?.title ?? '菜单'}
                </Text>

                {(activeSection?.items ?? []).length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: panelBorder,
                        shadowColor: panelShadow,
                      },
                    ]}
                  >
                    <View style={[styles.emptyIconWrap, { backgroundColor: softPink }]}>
                      <UtensilsCrossed size={30} color={theme.colors.primary} strokeWidth={2.2} />
                      <View style={[styles.emptySparkle, { backgroundColor: theme.colors.surface }]}>
                        <Sparkles size={13} color={theme.colors.primary} strokeWidth={2.4} />
                      </View>
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{emptyTitle}</Text>
                    <Text style={[styles.emptyText, { color: mutedText }]}>{emptyText}</Text>
                    <Pressable
                      style={[styles.emptyAction, { backgroundColor: theme.colors.primary }]}
                      onPress={handleEmptyAction}
                    >
                      {isSearching ? (
                        <Search size={16} color="#ffffff" strokeWidth={2.4} />
                      ) : (
                        <Plus size={16} color="#ffffff" strokeWidth={2.6} />
                      )}
                      <Text style={styles.emptyActionText}>{emptyActionLabel}</Text>
                    </Pressable>
                  </View>
                ) : (
                  (activeSection?.items ?? []).map((item, index) => {
                    const badgeType = index === 0 ? 'top' : index === 1 ? 'recommend' : 'plain';
                    const soldOut = item.available_count <= 0;

                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.menuCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: panelBorder,
                            shadowColor: panelShadow,
                            opacity: soldOut ? 0.72 : 1,
                          },
                        ]}
                        onPress={() => navigation.navigate('MenuDetail', { menuId: item.id })}
                      >
                        <View style={[styles.imageFrame, { borderColor: theme.colors.cardBorder }]}>
                          {item.cover_image_url ? (
                            <Image source={{ uri: item.cover_image_url }} style={styles.menuImage} />
                          ) : (
                            <View style={[styles.imagePlaceholder, { backgroundColor: categorySurface }]} />
                          )}
                          {badgeType !== 'plain' ? (
                            <View
                              style={[
                                styles.badge,
                                { backgroundColor: badgeType === 'top' ? theme.colors.danger : theme.colors.secondary },
                              ]}
                            >
                              {badgeType === 'top' ? (
                                <Flame size={10} color="#ffffff" strokeWidth={2.2} />
                              ) : (
                                <ThumbsUp size={10} color="#ffffff" strokeWidth={2.2} />
                              )}
                              <Text style={styles.badgeText}>{badgeType === 'top' ? 'TOP 1' : '推荐'}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.menuMeta}>
                          <View>
                            <Text style={[styles.menuTitle, { color: theme.colors.text }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={[styles.menuDesc, { color: mutedText }]} numberOfLines={1}>
                              {item.description ?? '今天也想吃点甜甜的'}
                            </Text>
                          </View>

                          <View style={styles.cardFooter}>
                            <View
                              style={[
                                styles.stockPill,
                                {
                                  backgroundColor: soldOut ? withAlpha(theme.colors.surfaceAlt, 0.9) : softPink,
                                  borderColor: soldOut
                                    ? withAlpha(theme.colors.cardBorder, 0.7)
                                    : withAlpha(theme.colors.primarySoft, 0.5),
                                },
                              ]}
                            >
                              <Text style={[styles.stockText, { color: soldOut ? mutedText : theme.colors.primary }]}>
                                剩余 {item.available_count} 次
                              </Text>
                            </View>

                            <Pressable
                              style={[
                                styles.addButton,
                                {
                                  backgroundColor: soldOut
                                    ? withAlpha(theme.colors.surfaceAlt, 0.92)
                                    : theme.colors.primarySoft,
                                },
                              ]}
                              onPress={() =>
                                navigation.navigate(
                                  previewRole === 'publisher' ? 'MenuForm' : 'OrderConfirm',
                                  previewRole === 'publisher' ? { menuId: item.id } : { menuId: item.id },
                                )
                              }
                            >
                              <Plus size={16} color={soldOut ? mutedText : theme.colors.primary} strokeWidth={2.8} />
                            </Pressable>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    right: -60,
    top: 60,
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  canvas: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  searchBar: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  actionPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  contentRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  contentRowEmpty: {
    gap: 0,
  },
  categoryRailScroll: {
    width: 90,
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryRail: {
    gap: 8,
    paddingBottom: 24,
  },
  menuPanel: {
    flex: 1,
    minWidth: 0,
  },
  categoryButton: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  categoryText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    width: 4,
    height: '50%',
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  menuColumn: {
    gap: 16,
    paddingBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  menuCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  imageFrame: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  menuImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  menuMeta: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  menuTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  menuDesc: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stockText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    minHeight: 260,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  emptyIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  emptySparkle: {
    position: 'absolute',
    right: -2,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyAction: {
    marginTop: 22,
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyActionText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
});
