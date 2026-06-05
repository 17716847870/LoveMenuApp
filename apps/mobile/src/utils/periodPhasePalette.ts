import { MenstrualPhaseKey } from '../types/period';

export const periodPhasePalette = {
  period: '#ff4d73',
  follicular: '#fb923c',
  ovulation: '#f4b400',
  luteal: '#ff7f6a',
} as const;

export function getPhaseAccentColor(phaseKey: MenstrualPhaseKey) {
  if (phaseKey === 'period') return periodPhasePalette.period;
  if (phaseKey === 'follicular') return periodPhasePalette.follicular;
  if (phaseKey === 'ovulation') return periodPhasePalette.ovulation;
  return periodPhasePalette.luteal;
}
