import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme/useAppTheme';

export type TimeValue = {
  hour: number;
  minute: number;
  second: number;
};

type TimeBottomSheetPickerProps = {
  visible: boolean;
  value?: TimeValue;
  title?: string;
  showSecond?: boolean;
  onClose: () => void;
  onConfirm: (time: TimeValue) => void;
};

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function getCurrentTime(): TimeValue {
  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
  };
}

const SHEET_TRANSLATE_Y = 420;
const COLUMN_HEIGHT = 230;
const OPTION_HEIGHT = 42;
const OPTION_GAP = 8;
const OPTION_STEP = OPTION_HEIGHT + OPTION_GAP;

export function TimeBottomSheetPicker({
  visible,
  value,
  title = '选择时间',
  showSecond = true,
  onClose,
  onConfirm,
}: TimeBottomSheetPickerProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const translateY = useRef(new Animated.Value(SHEET_TRANSLATE_Y)).current;
  const initialTime = value ?? getCurrentTime();
  const [mounted, setMounted] = useState(visible);
  const [hour, setHour] = useState(initialTime.hour);
  const [minute, setMinute] = useState(initialTime.minute);
  const [second, setSecond] = useState(initialTime.second);

  useEffect(() => {
    if (visible) {
      setMounted(true);
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
  }, [translateY, visible]);

  useEffect(() => {
    if (!visible) return;
    const nextTime = value ?? getCurrentTime();
    setHour(nextTime.hour);
    setMinute(nextTime.minute);
    setSecond(nextTime.second);
  }, [value, visible]);

  const hours = useMemo(() => range(0, 23), []);
  const minutes = useMemo(() => range(0, 59), []);
  const seconds = useMemo(() => range(0, 59), []);
  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.55) : '#f4d8d1';

  const confirm = () => {
    onConfirm({ hour, minute, second: showSecond ? second : 0 });
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

          <View style={styles.columns}>
            <PickerColumn items={hours} value={hour} suffix="时" onChange={setHour} />
            <PickerColumn items={minutes} value={minute} suffix="分" onChange={setMinute} />
            {showSecond ? <PickerColumn items={seconds} value={second} suffix="秒" onChange={setSecond} /> : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PickerColumn({
  items,
  value,
  suffix,
  onChange,
}: {
  items: number[];
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const theme = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const index = items.indexOf(value);
    if (index < 0) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, index * OPTION_STEP - (COLUMN_HEIGHT - OPTION_HEIGHT) / 2),
        animated: false,
      });
    });
  }, [items, value]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.column}
      contentContainerStyle={styles.columnContent}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => {
        const active = item === value;
        const label = String(item).padStart(2, '0');
        return (
          <Pressable
            key={item}
            style={[
              styles.option,
              {
                backgroundColor: active ? theme.colors.primarySoft : 'transparent',
                borderColor: active ? theme.colors.primarySoft : 'transparent',
              },
            ]}
            onPress={() => onChange(item)}
          >
            <Text style={[styles.optionText, { color: active ? theme.colors.primary : theme.colors.textMuted }]}>
              {label}
              {suffix}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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
  columns: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  column: {
    flex: 1,
    maxHeight: COLUMN_HEIGHT,
  },
  columnContent: {
    gap: 8,
    paddingBottom: 12,
  },
  option: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
