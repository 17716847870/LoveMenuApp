import { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../store/appStore';
import { ThemeMotif } from './ThemeDecor';
import { useAppTheme } from '../theme/useAppTheme';

type SectionCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}>;

export function SectionCard({ title, subtitle, icon, children }: SectionCardProps) {
  const theme = useAppTheme();
  const activeTheme = useAppStore((state) => state.activeTheme);
  const radius = theme.visualStyle === 'illustrated' ? 24 : theme.visualStyle === 'playful' ? 22 : theme.visualStyle === 'night' ? 18 : 20;

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: radius,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.cardBorder,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          {icon ? <View style={[styles.titleIconWrap, { backgroundColor: theme.colors.surfaceAlt }]}>{icon}</View> : null}
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        </View>
        <ThemeMotif themeName={activeTheme} variant="card" />
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  titleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
  },
  content: {
    marginTop: 14,
    gap: 10,
  },
});
