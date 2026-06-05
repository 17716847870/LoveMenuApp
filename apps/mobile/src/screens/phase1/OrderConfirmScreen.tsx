import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Heart, NotebookPen, PackageCheck, Plus, ReceiptText, Tags, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDialog } from '../../components/AppDialog';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { MenuEntity } from '../../types/phaseOne';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirm'>;

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

function isMenuEntity(item: MenuEntity | undefined): item is MenuEntity {
  return Boolean(item);
}

export function OrderConfirmScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, menus, relationship, menuCategories, loadBootstrap } = useAppStore();
  const [remark, setRemark] = useState('今晚就想要这个');
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>(() => {
    const ids = route.params.menuIds ?? (route.params.menuId ? [route.params.menuId] : []);
    return [...new Set(ids)];
  });
  const selectedMenus = useMemo(
    () => selectedMenuIds.map((id) => menus.find((item) => item.id === id)).filter(isMenuEntity),
    [menus, selectedMenuIds],
  );
  const availableMenus = useMemo(
    () =>
      menus.filter(
        (item) =>
          item.is_published &&
          item.status === 'active' &&
          !selectedMenuIds.includes(item.id) &&
          (!item.is_limited || item.available_count > 0),
      ),
    [menus, selectedMenuIds],
  );

  if (!currentUser || !relationship) {
    return null;
  }

  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.38) : theme.colors.cardBorder;
  const shadowColor = withAlpha(theme.colors.primary, theme.dark ? 0.16 : 0.08);
  const softSurface = theme.dark ? withAlpha(theme.colors.surfaceAlt, 0.9) : withAlpha(theme.colors.surfaceAlt, 0.8);
  const singleMenu = selectedMenus.length === 1 ? selectedMenus[0] : null;
  const detailItems = [
    singleMenu?.is_limited
      ? {
          key: 'stock',
          label: '剩余次数',
          value: `${singleMenu.available_count} 次`,
          icon: PackageCheck,
        }
      : null,
    singleMenu?.remark
      ? {
          key: 'remark',
          label: '菜单备注',
          value: singleMenu.remark,
          icon: ReceiptText,
        }
      : null,
    singleMenu?.category_id
      ? {
          key: 'category',
          label: '所属分类',
          value: menuCategories.find((item) => item.id === singleMenu.category_id)?.name,
          icon: Tags,
        }
      : null,
  ].filter((item): item is { key: string; label: string; value: string; icon: typeof PackageCheck } =>
    Boolean(item?.value),
  );

  const addMenu = (menuId: number) => {
    setSelectedMenuIds((ids) => [...ids, menuId]);
  };

  const removeMenu = (menuId: number) => {
    setSelectedMenuIds((ids) => (ids.length <= 1 ? ids : ids.filter((id) => id !== menuId)));
  };

  const handleCreateOrder = async () => {
    if (selectedMenus.length === 0) {
      dialog.alert('还差一点', '请至少选择一个菜单');
      return;
    }

    await phaseOneApi.createOrders({
      menu_ids: selectedMenus.map((item) => item.id),
      user_remark: remark || null,
    });

    await loadBootstrap();
    dialog.alert('下单成功', selectedMenus.length > 1 ? `订单已创建，共 ${selectedMenus.length} 个菜品` : '订单已创建');
    navigation.replace('MainTabs');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="确认浪漫之约" subtitle="请核对精心准备的详情" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 132, 160) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor, shadowColor }]}>
          <View
            pointerEvents="none"
            style={[styles.summaryGlow, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.2) }]}
          />
          <Text style={[styles.detailHeading, { color: theme.colors.primary }]}>已选菜单</Text>
          <View style={styles.selectedList}>
            {selectedMenus.map((item) => (
              <View
                key={item.id}
                style={[styles.selectedRow, { borderColor: withAlpha(theme.colors.cardBorder, 0.4) }]}
              >
                {item.cover_image_url ? (
                  <Image source={{ uri: item.cover_image_url }} style={styles.selectedImage} />
                ) : (
                  <View style={[styles.selectedImage, { backgroundColor: softSurface }]} />
                )}
                <View style={styles.selectedCopy}>
                  <Text style={[styles.summaryTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.summaryBody, { color: theme.colors.textMuted }]} numberOfLines={2}>
                    {item.description ?? '这一份晚餐，已经把今晚想说的话都准备好了。'}
                  </Text>
                </View>
                <Pressable
                  style={[styles.iconButton, { backgroundColor: theme.colors.surfaceAlt }]}
                  disabled={selectedMenus.length <= 1}
                  onPress={() => removeMenu(item.id)}
                >
                  <X
                    size={16}
                    color={selectedMenus.length <= 1 ? theme.colors.textSoft : theme.colors.primary}
                    strokeWidth={2.2}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {availableMenus.length > 0 ? (
          <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor, shadowColor }]}>
            <Text style={[styles.detailHeading, { color: theme.colors.primary }]}>继续加菜</Text>
            <View style={styles.addList}>
              {availableMenus.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.addRow, { borderColor: withAlpha(theme.colors.cardBorder, 0.35) }]}
                  onPress={() => addMenu(item.id)}
                >
                  <View style={styles.addCopy}>
                    <Text style={[styles.addTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.addMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      {item.is_limited ? `剩余 ${item.available_count} 次` : '不限次数'}
                    </Text>
                  </View>
                  <View style={[styles.addIcon, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.5) }]}>
                    <Plus size={16} color={theme.colors.primary} strokeWidth={2.3} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {detailItems.length > 0 ? (
          <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor, shadowColor }]}>
            <Text style={[styles.detailHeading, { color: theme.colors.primary }]}>菜单详情</Text>

            {detailItems.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === detailItems.length - 1;
              return (
                <View
                  key={item.key}
                  style={[
                    styles.detailRow,
                    !isLast ? { borderBottomColor: withAlpha(theme.colors.cardBorder, 0.3) } : null,
                    isLast ? styles.detailRowLast : null,
                  ]}
                >
                  <View
                    style={[styles.detailIconWrap, { backgroundColor: withAlpha(theme.colors.secondarySoft, 0.9) }]}
                  >
                    <Icon size={18} color={theme.colors.primary} strokeWidth={2.1} />
                  </View>
                  <View style={styles.detailCopy}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSoft }]}>{item.label}</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.noteSection}>
          <View style={styles.noteLabelRow}>
            <NotebookPen size={16} color={theme.colors.textMuted} strokeWidth={2.1} />
            <Text style={[styles.noteLabel, { color: theme.colors.textMuted }]}>下单备注</Text>
          </View>
          <TextInput
            multiline
            value={remark}
            onChangeText={setRemark}
            placeholder="例如：纪念日惊喜、忌口或喜欢的背景音乐风格..."
            placeholderTextColor={theme.colors.textSoft}
            style={[
              styles.noteInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor,
                color: theme.colors.text,
              },
            ]}
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom + 16, 24),
            backgroundColor: theme.dark ? withAlpha(theme.colors.background, 0.96) : 'rgba(255,255,255,0.84)',
            borderTopColor: borderColor,
          },
        ]}
      >
        <RomanticGradientButton
          title={selectedMenus.length > 1 ? `提交订单（${selectedMenus.length} 个菜品）` : '提交订单'}
          onPress={handleCreateOrder}
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
  sideGhost: {
    width: 36,
    height: 36,
  },
  floatingBack: {
    left: 24,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: 24,
    gap: 32,
  },
  headerSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.22,
  },
  subheading: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 6,
  },
  summaryGlow: {
    position: 'absolute',
    left: -16,
    top: -16,
    width: 96,
    height: 96,
    borderRadius: 999,
  },
  summaryImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectedList: {
    gap: 12,
  },
  selectedRow: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  selectedCopy: {
    flex: 1,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addList: {
    gap: 10,
  },
  addRow: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addCopy: {
    flex: 1,
  },
  addTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  addMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  detailHeading: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  noteSection: {
    gap: 8,
  },
  noteLabelRow: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  noteInput: {
    minHeight: 112,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
});
