import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme/useAppTheme';

type DateBottomSheetPickerProps = {
  visible: boolean;
  value?: Date;
  title?: string;
  dayCountResolver?: (year: number, month: number) => number;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function clampDay(
  year: number,
  month: number,
  day: number,
  dayCountResolver?: (year: number, month: number) => number,
) {
  const daysInMonth = dayCountResolver?.(year, month) ?? getDaysInMonth(year, month);
  return Math.min(day, daysInMonth);
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const SHEET_TRANSLATE_Y = 420;
const COLUMN_HEIGHT = 230;
const OPTION_HEIGHT = 42;
const OPTION_GAP = 8;
const OPTION_STEP = OPTION_HEIGHT + OPTION_GAP;

export function DateBottomSheetPicker({
  visible,
  value,
  title = '选择日期',
  dayCountResolver,
  onClose,
  onConfirm,
}: DateBottomSheetPickerProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const translateY = useRef(new Animated.Value(SHEET_TRANSLATE_Y)).current;
  const wasVisibleRef = useRef(false);
  const initialDate = value ?? new Date();
  const [mounted, setMounted] = useState(visible);
  const [year, setYear] = useState(initialDate.getFullYear());
  const [month, setMonth] = useState(initialDate.getMonth() + 1);
  const [day, setDay] = useState(initialDate.getDate());

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
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;

    if (!justOpened) return;
    const nextDate = value ?? new Date();
    setYear(nextDate.getFullYear());
    setMonth(nextDate.getMonth() + 1);
    setDay(nextDate.getDate());
  }, [value, visible]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return range(currentYear - 50, currentYear + 50);
  }, []);
  const months = useMemo(() => range(1, 12), []);
  const days = useMemo(
    () => range(1, dayCountResolver?.(year, month) ?? getDaysInMonth(year, month)),
    [dayCountResolver, month, year],
  );
  const borderColor = theme.dark ? withAlpha(theme.colors.cardBorder, 0.55) : '#f4d8d1';

  const updateYear = (nextYear: number) => {
    setYear(nextYear);
    setDay((prev) => clampDay(nextYear, month, prev, dayCountResolver));
  };

  const updateMonth = (nextMonth: number) => {
    setMonth(nextMonth);
    setDay((prev) => clampDay(year, nextMonth, prev, dayCountResolver));
  };

  const confirm = () => {
    onConfirm(new Date(year, month - 1, day));
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
            <PickerColumn items={years} value={year} suffix="年" onChange={updateYear} />
            <PickerColumn items={months} value={month} suffix="月" onChange={updateMonth} />
            <PickerColumn items={days} value={day} suffix="日" onChange={setDay} />
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

  const scrollToItem = (item: number, animated: boolean) => {
    const index = items.indexOf(item);
    if (index < 0) return;

    scrollRef.current?.scrollTo({
      y: Math.max(0, index * OPTION_STEP - (COLUMN_HEIGHT - OPTION_HEIGHT) / 2),
      animated,
    });
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToItem(value, false);
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
        return (
          <PickerOption
            key={item}
            active={active}
            label={`${item}${suffix}`}
            onPress={() => {
              scrollToItem(item, true);
              onChange(item);
            }}
          />
        );
      })}
    </ScrollView>
  );
}

function PickerOption({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const theme = useAppTheme();
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: active ? 1 : 0,
      damping: 16,
      stiffness: 180,
      mass: 0.65,
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', theme.colors.primarySoft],
  });
  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', theme.colors.primarySoft],
  });
  const color = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.textMuted, theme.colors.primary],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.option, { backgroundColor, borderColor, transform: [{ scale }] }]}>
        <Animated.Text style={[styles.optionText, { color }]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
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
