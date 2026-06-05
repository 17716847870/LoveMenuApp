import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { PeriodCalendarMonthDto } from '../types/period';
import { periodPhasePalette } from '../utils/periodPhasePalette';

type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textSoft: string;
  primary: string;
  primarySoft: string;
  secondarySoft: string;
  cardBorder: string;
};

const SELECTED_DAY_BORDER_COLOR = '#2563eb';
const DAY_PILL_WIDTH = 42;
const DAY_PILL_HEIGHT = 58;

type Props = {
  themeColors: ThemeColors;
  monthTitle: string;
  monthData: PeriodCalendarMonthDto;
  canGoNext: boolean;
  selectedDate?: string | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay?: (day: number) => void;
  dayDisabled?: (day: number) => boolean;
};

type CalendarDay = {
  key: string;
  dayNumber: number | null;
  inMonth: boolean;
};

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildCalendarDays(year: number, monthIndex: number) {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = 42;

  return Array.from({ length: totalCells }, (_, index): CalendarDay => {
    const dayNumber = index - firstDayOfWeek + 1;
    const inMonth = dayNumber > 0 && dayNumber <= totalDays;

    return {
      key: `calendar-day-${year}-${monthIndex + 1}-${inMonth ? dayNumber : `blank-${index}`}`,
      dayNumber: inMonth ? dayNumber : null,
      inMonth,
    };
  });
}

export function PeriodMonthCalendarCard({
  themeColors,
  monthTitle,
  monthData,
  canGoNext,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  dayDisabled,
}: Props) {
  const calendarDays = buildCalendarDays(monthData.year, monthData.month - 1);
  const markerMap = new Map<number, Set<string>>();
  const effectiveSelectedDate =
    selectedDate ??
    (monthData.selectedDay
      ? `${monthData.year}-${String(monthData.month).padStart(2, '0')}-${String(monthData.selectedDay).padStart(2, '0')}`
      : null);

  monthData.markers.forEach((marker) => {
    const markerDay = getDayFromDateKey(marker.date, monthData.year, monthData.month);
    if (!markerDay) {
      return;
    }

    const currentSet = markerMap.get(markerDay) ?? new Set<string>();
    currentSet.add(marker.type);
    markerMap.set(markerDay, currentSet);
  });

  return (
    <View
      style={[
        styles.calendarCard,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.cardBorder,
          shadowColor: withAlpha(themeColors.primary, 0.1),
        },
      ]}
    >
      <View style={[styles.calendarGlow, { backgroundColor: withAlpha(themeColors.primarySoft, 0.2) }]} />

      <View style={styles.heading}>
        <View>
          <Text style={[styles.title, { color: themeColors.text }]}>{monthTitle}</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>{monthData.summaryText}</Text>
        </View>
        <View style={styles.monthNav}>
          <Pressable style={[styles.circleButton, { backgroundColor: themeColors.surfaceAlt }]} onPress={onPrevMonth}>
            <ChevronLeft size={18} color={themeColors.text} />
          </Pressable>
          <Pressable
            style={[
              styles.circleButton,
              {
                backgroundColor: themeColors.surfaceAlt,
                opacity: canGoNext ? 1 : 0.45,
              },
            ]}
            onPress={onNextMonth}
            disabled={!canGoNext}
          >
            <ChevronRight size={18} color={themeColors.text} />
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.legendRow,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.cardBorder,
            shadowColor: withAlpha(themeColors.primary, 0.05),
          },
        ]}
      >
        {[
          { label: '经期', color: periodPhasePalette.period },
          { label: '卵泡期', color: periodPhasePalette.follicular },
          { label: '排卵期', color: periodPhasePalette.ovulation },
          { label: '黄体期', color: periodPhasePalette.luteal },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: item.color,
                },
              ]}
            />
            <Text style={[styles.legendText, { color: themeColors.textSoft }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.weekHeader}>
        {['日', '一', '二', '三', '四', '五', '六'].map((item) => (
          <Text
            key={item}
            style={[
              styles.weekLabel,
              {
                color: item === '日' || item === '六' ? withAlpha(themeColors.textSoft, 0.7) : themeColors.textSoft,
              },
            ]}
          >
            {item}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {calendarDays.map((item) => {
          const day = item.dayNumber;
          const dateKey =
            day != null
              ? `${monthData.year}-${String(monthData.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              : null;
          const dayMarkers = day != null ? markerMap.get(day) : undefined;
          const isSelected = Boolean(dateKey && dateKey === effectiveSelectedDate);
          const isDisabled = day == null ? true : (dayDisabled?.(day) ?? false);
          const isPeriod = dayMarkers?.has('period') ?? false;
          const isPeriodRange = dayMarkers?.has('period_range') ?? false;
          const isOvulation = dayMarkers?.has('ovulation') ?? false;
          const isOvulationRange = dayMarkers?.has('ovulation_range') ?? false;
          const isPredicted = dayMarkers?.has('predicted_period') ?? false;
          const isFollicular = dayMarkers?.has('follicular') ?? false;
          const isLuteal = dayMarkers?.has('luteal') ?? false;
          const isPeriodPhase = isPeriod || isPeriodRange || isPredicted;
          const dotColor =
            isPeriod || isPeriodRange || isPredicted
              ? periodPhasePalette.period
              : isOvulation || isOvulationRange
                ? periodPhasePalette.ovulation
                : isFollicular
                  ? periodPhasePalette.follicular
                  : isLuteal
                    ? periodPhasePalette.luteal
                    : null;
          const textColor = !item.inMonth
            ? 'transparent'
            : isSelected || !isDisabled
              ? themeColors.text
              : withAlpha(themeColors.textSoft, 0.72);

          return (
            <Pressable
              key={item.key}
              style={styles.dayCell}
              onPress={day != null && !isDisabled && onSelectDay ? () => onSelectDay(day) : undefined}
              disabled={day == null || !onSelectDay || isDisabled}
            >
              <View style={styles.dayCellInner}>
                {isPeriodPhase ? <View pointerEvents="none" style={styles.periodDayFill} /> : null}
                {isPeriod || isPredicted ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.periodDayBorder,
                      isPredicted ? styles.predictedDayBorder : null,
                    ]}
                  />
                ) : null}
                {isSelected ? <View pointerEvents="none" style={styles.selectedDayBorder} /> : null}
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: textColor,
                      fontWeight: isSelected ? '600' : '500',
                    },
                  ]}
                >
                  {day ?? ''}
                </Text>
                {dotColor ? (
                  <View
                    style={[
                      styles.dayDot,
                      isPredicted
                        ? {
                            backgroundColor: withAlpha(periodPhasePalette.period, 0.78),
                            borderColor: periodPhasePalette.period,
                            borderWidth: 1,
                            borderStyle: 'dashed',
                          }
                        : { backgroundColor: dotColor },
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getDayFromDateKey(dateKey: string, year: number, month: number) {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const markerYear = Number(yearText);
  const markerMonth = Number(monthText);
  const markerDay = Number(dayText);

  if (markerYear !== year || markerMonth !== month || !markerDay) {
    return null;
  }

  return markerDay;
}

const styles = StyleSheet.create({
  calendarCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
  },
  calendarGlow: {
    position: 'absolute',
    right: -36,
    top: -36,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heading: {
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  monthNav: {
    flexDirection: 'row',
    gap: 12,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekLabel: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285714%',
    height: 66,
    paddingHorizontal: 2,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInner: {
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_HEIGHT,
    backgroundColor: 'transparent',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodDayFill: {
    position: 'absolute',
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_HEIGHT,
    borderRadius: DAY_PILL_HEIGHT / 2,
    backgroundColor: withAlpha(periodPhasePalette.period, 0.14),
    zIndex: 0,
  },
  selectedDayBorder: {
    position: 'absolute',
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_HEIGHT,
    borderRadius: DAY_PILL_HEIGHT / 2,
    borderWidth: 2,
    borderColor: SELECTED_DAY_BORDER_COLOR,
    zIndex: 2,
  },
  periodDayBorder: {
    position: 'absolute',
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_HEIGHT,
    borderRadius: DAY_PILL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: withAlpha(periodPhasePalette.period, 0.42),
    zIndex: 1,
  },
  predictedDayBorder: {
    borderStyle: 'dashed',
  },
  dayText: {
    fontSize: 18,
    lineHeight: 22,
    zIndex: 1,
  },
  dayDot: {
    position: 'absolute',
    bottom: 11,
    width: 8,
    height: 8,
    borderRadius: 999,
    zIndex: 1,
  },
});
