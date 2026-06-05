import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme/useAppTheme';

type PageHeaderBlockProps = {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  size?: 'hero' | 'section';
  action?: ReactNode;
  titleColor?: string;
  subtitleColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function PageHeaderBlock({
  title,
  subtitle,
  align = 'left',
  size = 'hero',
  action,
  titleColor,
  subtitleColor,
  style,
}: PageHeaderBlockProps) {
  const theme = useAppTheme();
  const textAlign: TextStyle['textAlign'] = align === 'center' ? 'center' : 'left';

  return (
    <View style={[styles.root, action ? styles.row : null, style]}>
      <View style={[styles.copy, align === 'center' ? styles.centerCopy : null]}>
        <Text
          style={[
            styles.title,
            size === 'section' ? styles.sectionTitle : styles.heroTitle,
            { color: titleColor ?? theme.colors.text, textAlign },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subtitleColor ?? theme.colors.textMuted, textAlign }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  copy: {
    flexShrink: 1,
  },
  centerCopy: {
    alignItems: 'center',
  },
  action: {
    flexShrink: 0,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.56,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 4,
  },
});
