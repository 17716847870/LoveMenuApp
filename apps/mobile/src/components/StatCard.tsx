import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { useAppTheme } from '../theme/useAppTheme';

type StatCardProps = {
  value: string | number;
  label: string;
  tone?: 'primary' | 'secondary';
};

export function StatCard({ value, label, tone = 'primary' }: StatCardProps) {
  const theme = useAppTheme();
  const palette =
    tone === 'secondary'
      ? { backgroundColor: theme.colors.secondarySoft, valueColor: theme.colors.text }
      : { backgroundColor: theme.colors.primarySoft, valueColor: theme.colors.primaryDeep };

  return (
    <View style={[styles.card, { backgroundColor: palette.backgroundColor, borderColor: theme.colors.cardBorder }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.surface }]}>
        <Sparkles size={16} color={theme.colors.primaryDeep} strokeWidth={2.2} />
      </View>
      <Text style={[styles.value, { color: palette.valueColor }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
  },
  label: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
});
