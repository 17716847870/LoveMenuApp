import { Pressable, ScrollView, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme/useAppTheme';

type PillSelectorItem<T extends string> = {
  key: T;
  label: string;
};

type PillSelectorProps<T extends string> = {
  items: Array<PillSelectorItem<T>>;
  value: T;
  onChange: (key: T) => void;
  layout?: 'scroll' | 'wrap';
  activeBackgroundColor?: string;
  inactiveBackgroundColor?: string;
  activeBorderColor?: string;
  inactiveBorderColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  pillStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function PillSelector<T extends string>({
  items,
  value,
  onChange,
  layout = 'scroll',
  activeBackgroundColor,
  inactiveBackgroundColor,
  activeBorderColor,
  inactiveBorderColor,
  activeTextColor,
  inactiveTextColor,
  style,
  contentContainerStyle,
  pillStyle,
  textStyle,
}: PillSelectorProps<T>) {
  const theme = useAppTheme();

  const pills = items.map((item) => {
    const active = item.key === value;

    return (
      <Pressable
        key={item.key}
        style={[
          styles.pill,
          {
            backgroundColor: active
              ? (activeBackgroundColor ?? theme.colors.primarySoft)
              : (inactiveBackgroundColor ?? theme.colors.surfaceAlt),
            borderColor: active
              ? (activeBorderColor ?? theme.colors.primarySoft)
              : (inactiveBorderColor ?? 'transparent'),
          },
          pillStyle,
        ]}
        onPress={() => onChange(item.key)}
      >
        <Text
          style={[
            styles.text,
            {
              color: active ? (activeTextColor ?? theme.colors.primary) : (inactiveTextColor ?? theme.colors.textMuted),
            },
            textStyle,
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  });

  if (layout === 'wrap') {
    return <View style={[styles.wrapContainer, contentContainerStyle, style]}>{pills}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[styles.scrollContainer, contentContainerStyle]}
    >
      {pills}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    gap: 10,
  },
  wrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
