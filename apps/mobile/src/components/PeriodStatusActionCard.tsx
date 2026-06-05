import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarClock, CheckCircle2, Edit3, Lock, RotateCcw } from 'lucide-react-native';

import { useAppTheme } from '../theme/useAppTheme';
import { PeriodDailyRecordDraftDto, PeriodStatusCardActionKey } from '../types/period';

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

type Props = {
  dailyDraft: PeriodDailyRecordDraftDto;
  accentColor: string;
  onConfirmStarted: () => void;
  onConfirmEnded: () => void;
  onPressDailyRecord: () => void;
  onPressCycleSettings: () => void;
  onPressHistoryCycle: () => void;
};

export function PeriodStatusActionCard({
  dailyDraft,
  accentColor,
  onConfirmStarted,
  onConfirmEnded,
  onPressDailyRecord,
  onPressCycleSettings,
  onPressHistoryCycle,
}: Props) {
  const theme = useAppTheme();
  const model = dailyDraft.statusCard;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: withAlpha(model.tone === 'blocked' ? theme.colors.cardBorder : accentColor, 0.28),
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: withAlpha(model.tone === 'blocked' ? theme.colors.surfaceAlt : accentColor, 0.16),
            },
          ]}
        >
          {model.tone === 'blocked' ? (
            <Lock size={18} color={theme.colors.textSoft} strokeWidth={2.2} />
          ) : model.tone === 'active' ? (
            <CalendarClock size={18} color={accentColor} strokeWidth={2.2} />
          ) : (
            <CheckCircle2 size={18} color={accentColor} strokeWidth={2.2} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: theme.colors.textSoft }]}>{model.eyebrow}</Text>
          <Text style={[styles.title, { color: model.tone === 'blocked' ? theme.colors.text : accentColor }]}>
            {model.title}
          </Text>
          <Text style={[styles.desc, { color: theme.colors.textMuted }]}>{model.description}</Text>
        </View>
      </View>

      {model.meta ? (
        <View
          style={[
            styles.meta,
            {
              backgroundColor: withAlpha(theme.colors.surfaceAlt, 0.72),
              borderColor: withAlpha(theme.colors.cardBorder, 0.5),
            },
          ]}
        >
          <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>{model.meta}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {model.actions.map((action) => {
          const isPrimary = action.enabled && (action.key === 'confirm_start' || action.key === 'confirm_end');
          return (
            <Pressable
              key={action.key}
              disabled={!action.enabled}
              style={[
                styles.actionButton,
                isPrimary
                  ? { backgroundColor: accentColor, borderColor: accentColor }
                  : {
                      backgroundColor: action.enabled ? theme.colors.surface : theme.colors.surfaceAlt,
                      borderColor: withAlpha(theme.colors.cardBorder, 0.72),
                    },
              ]}
              onPress={getActionHandler(action.key, {
                onConfirmStarted,
                onConfirmEnded,
                onPressDailyRecord,
                onPressCycleSettings,
                onPressHistoryCycle,
              })}
            >
              {renderActionIcon(action.icon, isPrimary ? '#ffffff' : theme.colors.textMuted)}
              <Text
                style={[
                  styles.actionText,
                  {
                    color: isPrimary ? '#ffffff' : action.enabled ? theme.colors.text : theme.colors.textSoft,
                  },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getActionHandler(
  key: PeriodStatusCardActionKey,
  handlers: {
    onConfirmStarted: () => void;
    onConfirmEnded: () => void;
    onPressDailyRecord: () => void;
    onPressCycleSettings: () => void;
    onPressHistoryCycle: () => void;
  },
) {
  if (key === 'confirm_start') {
    return handlers.onConfirmStarted;
  }
  if (key === 'confirm_end') {
    return handlers.onConfirmEnded;
  }
  if (key === 'edit_record') {
    return handlers.onPressDailyRecord;
  }
  if (key === 'adjust_current_start') {
    return handlers.onPressCycleSettings;
  }
  if (key === 'adjust_history_cycle') {
    return handlers.onPressHistoryCycle;
  }
  return undefined;
}

function renderActionIcon(icon: 'check' | 'edit' | 'record' | 'lock', color: string) {
  if (icon === 'edit') {
    return <Edit3 size={14} color={color} strokeWidth={2.4} />;
  }
  if (icon === 'record') {
    return <RotateCcw size={14} color={color} strokeWidth={2.4} />;
  }
  if (icon === 'lock') {
    return <Lock size={14} color={color} strokeWidth={2.4} />;
  }
  return <CheckCircle2 size={14} color={color} strokeWidth={2.4} />;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  title: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },
  desc: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
  },
  meta: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
