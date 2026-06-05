import { useMemo } from 'react';

import { useAppStore } from '../store/appStore';
import { getAppTheme } from './themes';

export function useAppTheme() {
  const activeTheme = useAppStore((state) => state.activeTheme);

  return useMemo(() => getAppTheme(activeTheme), [activeTheme]);
}
