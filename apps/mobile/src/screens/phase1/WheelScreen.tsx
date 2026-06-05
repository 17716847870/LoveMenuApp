import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Check, Dices, Heart, Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDialog } from '../../components/AppDialog';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';
import { WheelOptionEntity } from '../../types/phaseOne';

type Props = NativeStackScreenProps<RootStackParamList, 'Wheel'>;

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

function getOptionPosition(index: number, total: number) {
  const radius = 138;
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    left: 170 + Math.cos(angle) * radius - 38,
    top: 170 + Math.sin(angle) * radius - 20,
  };
}

export function WheelScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { orders, menus } = useAppStore();
  const [options, setOptions] = useState<WheelOptionEntity[]>([]);
  const [selected, setSelected] = useState<WheelOptionEntity | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pointerRotation = useRef(new Animated.Value(0)).current;
  const pointerRotationDegrees = useRef(0);

  const activeOrder = useMemo(() => {
    const lastOrder = orders[0];
    if (!lastOrder) {
      return null;
    }
    const menu = menus.find((item) => item.id === lastOrder.menu_id);
    return menu?.title ?? lastOrder.items?.map((item) => item.title_snapshot).join('、') ?? null;
  }, [menus, orders]);
  const wheelOptions = options;
  const pointerRotate = pointerRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  const loadOptions = useCallback(() => {
    setLoading(true);
    setErrorMessage(null);
    phaseOneApi
      .listWheelOptions()
      .then((response) => {
        setOptions(response.data);
      })
      .catch(() => {
        setErrorMessage('选项同步遇到问题，请稍后重试');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOptions();
    }, [loadOptions]),
  );

  const handleCreate = async () => {
    const title = draftTitle.trim();
    if (!title) {
      dialog.alert('先写一个选项', '比如：火锅、日料、楼下那家面馆。');
      return;
    }

    try {
      setSaving(true);
      const response = await phaseOneApi.createWheelOption({ title });
      setOptions((current) => [...current, response.data]);
      setDraftTitle('');
    } catch (error) {
      dialog.alert('没添加上', '选项暂时没有保存成功，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (option: WheelOptionEntity) => {
    dialog.confirm({
      title: '删除选项',
      message: `确定删除「${option.title}」吗？`,
      actions: [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            phaseOneApi
              .deleteWheelOption(option.id)
              .then(() => {
                setOptions((current) => current.filter((item) => item.id !== option.id));
                setSelected((current) => (current?.id === option.id ? null : current));
              })
              .catch(() => {
                dialog.alert('没删掉', '这个选项暂时没有删除成功，请稍后再试。');
              });
          },
        },
      ],
    });
  };

  const handleStart = async () => {
    if (options.length === 0) {
      dialog.alert('还没有选项', '先在下面添加几个想吃的选项，再开始转盘。');
      return;
    }

    try {
      setSpinning(true);
      setSelected(null);
      const response = await phaseOneApi.spinWheel();
      const nextOptions = options.map((item) => (item.id === response.data.id ? response.data : item));
      const selectedIndex = Math.max(
        nextOptions.findIndex((item) => item.id === response.data.id),
        0,
      );
      const step = 360 / Math.max(nextOptions.length, 1);
      const currentDegrees = pointerRotationDegrees.current;
      const currentNormalizedDegrees = ((currentDegrees % 360) + 360) % 360;
      const targetNormalizedDegrees = selectedIndex * step;
      const travelDegrees = (targetNormalizedDegrees - currentNormalizedDegrees + 360) % 360;
      const targetDegrees = currentDegrees + 360 * 5 + travelDegrees;

      setOptions(nextOptions);
      pointerRotationDegrees.current = targetDegrees;
      Animated.timing(pointerRotation, {
        toValue: targetDegrees,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setSelected(response.data);
          setSpinning(false);
        }
      });
    } catch (error) {
      dialog.alert('没抽出来', '转盘暂时没有抽取成功，请稍后再试。');
      setSpinning(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View pointerEvents="none" style={styles.ambientLayer}>
        <View style={[styles.glowA, { backgroundColor: theme.colors.primarySoft }]} />
        <View style={[styles.glowB, { backgroundColor: theme.colors.secondarySoft }]} />
      </View>

      <View style={[styles.floatingBackWrap, { top: insets.top + 20 }]}>
        <Pressable
          style={[
            styles.floatingBackButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: withAlpha(theme.colors.cardBorder, 0.5),
              shadowColor: withAlpha(theme.colors.primary, 0.15),
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={28} color={theme.colors.primary} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 88, paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.colors.text }]}>今天吃什么？</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>先添加选项，再交给命运的指针</Text>
        </View>

        <View style={styles.wheelWrap}>
          <View style={[styles.outerRing, { borderColor: withAlpha(theme.colors.primary, 0.1) }]} />
          <View style={[styles.dashedRing, { borderColor: withAlpha(theme.colors.primary, 0.25) }]} />
          <View style={[styles.innerRing, { backgroundColor: withAlpha(theme.colors.surface, 0.75) }]} />

          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : wheelOptions.length > 0 ? (
            <>
              {wheelOptions.map((option, index) => {
                const isActive = selected?.id === option.id;
                return (
                  <View
                    key={option.id}
                    style={[
                      styles.slot,
                      getOptionPosition(index, wheelOptions.length),
                      {
                        backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                        borderColor: isActive ? '#ffffff' : withAlpha(theme.colors.cardBorder, 0.5),
                        shadowColor: isActive
                          ? withAlpha(theme.colors.primary, 0.4)
                          : withAlpha(theme.colors.text, 0.08),
                        transform: [{ scale: isActive ? 1.08 : 1 }],
                      },
                    ]}
                  >
                    {!isActive ? (
                      <View style={[styles.slotDot, { backgroundColor: withAlpha(theme.colors.primary, 0.42) }]} />
                    ) : null}
                    <Text
                      style={[styles.slotLabel, { color: isActive ? '#ffffff' : theme.colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {option.title}
                    </Text>
                  </View>
                );
              })}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pointerOrbit,
                  {
                    transform: [{ rotate: pointerRotate }],
                  },
                ]}
              >
                <View style={[styles.pointerStem, { backgroundColor: theme.colors.primary }]} />
                <View style={[styles.pointerHead, { backgroundColor: theme.colors.primary }]} />
              </Animated.View>
            </>
          ) : (
            <View style={styles.emptyWheel}>
              <Dices size={30} color={theme.colors.primary} strokeWidth={2} />
              <Text style={[styles.emptyWheelText, { color: theme.colors.textMuted }]}>先添加选项</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.centerButton,
              {
                backgroundColor: options.length > 0 ? theme.colors.primary : withAlpha(theme.colors.cardBorder, 0.8),
              },
            ]}
            onPress={handleStart}
            disabled={spinning}
          >
            <View pointerEvents="none" style={styles.centerGloss} />
            {spinning ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.centerText}>开始</Text>
                <Text style={styles.centerSubtext}>Start</Text>
              </>
            )}
          </Pressable>
        </View>

        {selected ? (
          <View style={styles.resultCardWrap}>
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: withAlpha(theme.colors.primary, 0.3),
                  shadowColor: withAlpha(theme.colors.primary, 0.2),
                },
              ]}
            >
              <View style={[styles.resultCardGlow, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.7) }]} />
              <View
                style={[
                  styles.resultIconWrap,
                  { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
                ]}
              >
                <Check size={28} color="#ffffff" strokeWidth={3.5} />
              </View>
              <View style={styles.resultCopy}>
                <Text style={[styles.resultLabel, { color: theme.colors.primary }]}>✨ 这次选中</Text>
                <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {selected.title}
                </Text>
              </View>
              <View style={styles.resultDeco} pointerEvents="none">
                <Heart size={64} color={withAlpha(theme.colors.primary, 0.08)} strokeWidth={1.5} />
              </View>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.editorCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: withAlpha(theme.colors.cardBorder, 0.3),
              shadowColor: withAlpha(theme.colors.primary, 0.06),
            },
          ]}
        >
          <Text style={[styles.editorTitle, { color: theme.colors.text }]}>我的选项</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="添加一个想吃的选项"
              placeholderTextColor={theme.colors.textSoft}
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: withAlpha(theme.colors.cardBorder, 0.5),
                },
              ]}
              maxLength={64}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <Pressable
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#ffffff" /> : <Plus size={22} color="#ffffff" strokeWidth={2.4} />}
            </Pressable>
          </View>

          {errorMessage ? (
            <Text style={[styles.errorText, { color: theme.colors.primaryDeep }]}>{errorMessage}</Text>
          ) : null}

          <View style={styles.optionList}>
            {options.length > 0 ? (
              options.map((option) => (
                <View
                  key={option.id}
                  style={[styles.optionRow, { borderColor: withAlpha(theme.colors.cardBorder, 0.42) }]}
                >
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {option.title}
                    </Text>
                    <Text style={[styles.optionMeta, { color: theme.colors.textSoft }]}>
                      已抽中 {option.selected_count} 次
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.deleteButton, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.24) }]}
                    onPress={() => handleDelete(option)}
                  >
                    <Trash2 size={17} color={theme.colors.primary} strokeWidth={2.2} />
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyListText, { color: theme.colors.textMuted }]}>
                还没有选项，可以从“火锅”“烧烤”“想吃的店名”开始。
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.historyCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: withAlpha(theme.colors.cardBorder, 0.3),
              shadowColor: withAlpha(theme.colors.primary, 0.06),
            },
          ]}
        >
          <View style={[styles.historyIconWrap, { backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.95) }]}>
            <Heart size={18} color={theme.colors.textMuted} strokeWidth={2.1} />
          </View>
          <View style={styles.historyCopy}>
            <Text style={[styles.historyEyebrow, { color: theme.colors.textSoft }]}>上次约会</Text>
            <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{activeOrder ?? '还没有完成点单'}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Orders' })}>
            <Text style={[styles.historyAction, { color: theme.colors.primary }]}>详情</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glowA: {
    position: 'absolute',
    top: '-15%',
    left: '-20%',
    width: '70%',
    height: '70%',
    borderRadius: 999,
    opacity: 0.45,
    transform: [{ scale: 1.2 }],
  },
  glowB: {
    position: 'absolute',
    right: '-15%',
    bottom: '-10%',
    width: '80%',
    height: '80%',
    borderRadius: 999,
    opacity: 0.35,
    transform: [{ scale: 1.2 }],
  },
  floatingBackWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 30,
    paddingHorizontal: 20,
  },
  floatingBackButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 6,
  },
  content: {
    paddingHorizontal: 20,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  wheelWrap: {
    alignSelf: 'center',
    width: 340,
    height: 340,
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: 170,
    borderWidth: 8,
    opacity: 0.8,
  },
  dashedRing: {
    position: 'absolute',
    inset: 16,
    borderRadius: 154,
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  innerRing: {
    position: 'absolute',
    inset: 32,
    borderRadius: 138,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  slot: {
    position: 'absolute',
    zIndex: 20,
    minWidth: 76,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 6,
  },
  slotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  slotLabel: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyWheel: {
    alignItems: 'center',
    gap: 12,
  },
  emptyWheelText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  pointerOrbit: {
    position: 'absolute',
    inset: 0,
    zIndex: 26,
  },
  pointerStem: {
    position: 'absolute',
    top: 60,
    left: 168,
    width: 4,
    height: 90,
    borderRadius: 2,
  },
  pointerHead: {
    position: 'absolute',
    top: 48,
    left: 160,
    width: 20,
    height: 20,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  centerButton: {
    zIndex: 30,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  centerGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    transform: [{ scaleX: 1.5 }],
  },
  centerText: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  centerSubtext: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultCardWrap: {
    marginTop: 12,
    marginBottom: 24,
  },
  resultCard: {
    borderRadius: 28,
    borderWidth: 2,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  resultCardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  resultIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 1,
  },
  resultCopy: {
    flex: 1,
    zIndex: 1,
  },
  resultLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  resultTitle: {
    marginTop: 4,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  resultDeco: {
    position: 'absolute',
    right: -10,
    bottom: -20,
    zIndex: 0,
    transform: [{ rotate: '-15deg' }],
  },
  editorCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 5,
  },
  editorTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  optionList: {
    marginTop: 16,
    gap: 12,
  },
  optionRow: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  optionMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  historyCard: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 4,
  },
  historyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  historyCopy: {
    flex: 1,
  },
  historyEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  historyAction: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
