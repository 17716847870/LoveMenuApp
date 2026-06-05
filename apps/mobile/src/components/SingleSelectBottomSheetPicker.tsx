import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme/useAppTheme';

export type SingleSelectOption<T extends string | number> = {
  label: string;
  value: T;
  description?: string;
};

type SingleSelectBottomSheetPickerProps<T extends string | number> = {
  visible: boolean;
  title?: string;
  value: T;
  options: Array<SingleSelectOption<T>>;
  onClose: () => void;
  onConfirm: (value: T) => void;
};

const SHEET_TRANSLATE_Y = 420;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function SingleSelectBottomSheetPicker<T extends string | number>({
  visible,
  title = '请选择',
  value,
  options,
  onClose,
  onConfirm,
}: SingleSelectBottomSheetPickerProps<T>) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const translateY = useRef(new Animated.Value(SHEET_TRANSLATE_Y)).current;
  const [mounted, setMounted] = useState(visible);
  const [draftValue, setDraftValue] = useState(value);
  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.55) : '#f4d8d1';

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setDraftValue(value);
      translateY.setValue(SHEET_TRANSLATE_Y);
      requestAnimationFrame(() => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    Animated.timing(translateY, {
      toValue: SHEET_TRANSLATE_Y,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [translateY, value, visible]);

  const confirm = () => {
    onConfirm(draftValue);
    onClose();
  };

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 12) + 12,
              backgroundColor: theme.colors.surface,
              borderColor,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Pressable hitSlop={10} onPress={onClose}>
              <Text style={[styles.headerAction, { color: theme.colors.textMuted }]}>取消</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <Pressable hitSlop={10} onPress={confirm}>
              <Text style={[styles.headerAction, { color: theme.colors.primary }]}>完成</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.optionList} contentContainerStyle={styles.optionListContent}>
            {options.map((option) => {
              const active = option.value === draftValue;
              return (
                <Pressable
                  key={String(option.value)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceAlt,
                      borderColor: active ? theme.colors.primarySoft : withAlpha(theme.colors.cardBorder, 0.24),
                    },
                  ]}
                  onPress={() => setDraftValue(option.value)}
                >
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionLabel, { color: active ? theme.colors.primary : theme.colors.text }]}>
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text style={[styles.optionDescription, { color: theme.colors.textMuted }]}>
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                  {active ? <Check size={18} color={theme.colors.primary} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(30, 34, 48, 0.36)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(138, 143, 160, 0.32)',
    marginBottom: 14,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  headerAction: {
    minWidth: 48,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  optionList: {
    maxHeight: 340,
  },
  optionListContent: {
    gap: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  optionRow: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionLabel: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
});
