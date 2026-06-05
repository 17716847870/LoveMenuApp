import { Theme as NavigationTheme } from '@react-navigation/native';

export type ThemeName = '情侣主题' | '可爱主题' | '夜间主题' | '哆啦A梦主题' | '粉色小猪主题';

export type AppTheme = {
  name: ThemeName;
  dark: boolean;
  visualStyle: 'romantic' | 'playful' | 'night' | 'illustrated';
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    card: string;
    cardBorder: string;
    text: string;
    textMuted: string;
    textSoft: string;
    primary: string;
    primaryDeep: string;
    primarySoft: string;
    secondary: string;
    secondarySoft: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    tabBar: string;
    shadow: string;
    input: string;
    inputBorder: string;
    inputText: string;
    badgeText: string;
  };
  gradients: {
    hero: [string, string];
    spotlight: [string, string];
    button: [string, string, string];
  };
};

export const themes: Record<ThemeName, AppTheme> = {
  情侣主题: {
    name: '情侣主题',
    dark: false,
    visualStyle: 'romantic',
    colors: {
      background: '#fff7f5',
      surface: '#fffdfb',
      surfaceAlt: '#fff0ec',
      card: '#fffaf8',
      cardBorder: '#f4d8d1',
      text: '#1e2230',
      textMuted: '#6d7286',
      textSoft: '#8a8fa0',
      primary: '#e85d75',
      primaryDeep: '#c43f5c',
      primarySoft: '#ffe0e6',
      secondary: '#ff9d7a',
      secondarySoft: '#fff0e8',
      accent: '#ffcb77',
      success: '#3bb273',
      warning: '#f2a93b',
      danger: '#d64550',
      tabBar: '#fffaf8',
      shadow: 'rgba(184, 87, 110, 0.12)',
      input: '#fffefd',
      inputBorder: '#efd2cb',
      inputText: '#1e2230',
      badgeText: '#7f2640',
    },
    gradients: {
      hero: ['#ffdfdf', '#ffd4c8'],
      spotlight: ['#fff4ef', '#ffe1e8'],
      button: ['#ff8aa0', '#f05f7b', '#d94c68'],
    },
  },
  可爱主题: {
    name: '可爱主题',
    dark: false,
    visualStyle: 'playful',
    colors: {
      background: '#fffaf0',
      surface: '#fffef8',
      surfaceAlt: '#fff4d9',
      card: '#fffdf6',
      cardBorder: '#f0dfb7',
      text: '#2f2841',
      textMuted: '#7b7490',
      textSoft: '#9b93ad',
      primary: '#f28f3b',
      primaryDeep: '#dd6b20',
      primarySoft: '#ffe4c7',
      secondary: '#f6c453',
      secondarySoft: '#fff3d1',
      accent: '#ff7f7f',
      success: '#49a96e',
      warning: '#e2a22f',
      danger: '#d35f63',
      tabBar: '#fffdf6',
      shadow: 'rgba(213, 142, 61, 0.14)',
      input: '#fffef9',
      inputBorder: '#ead8ab',
      inputText: '#2f2841',
      badgeText: '#8e4d00',
    },
    gradients: {
      hero: ['#ffeac0', '#ffd8d8'],
      spotlight: ['#fff7e4', '#ffefd2'],
      button: ['#ffb45f', '#f28f3b', '#dd6b20'],
    },
  },
  夜间主题: {
    name: '夜间主题',
    dark: true,
    visualStyle: 'night',
    colors: {
      background: '#111827',
      surface: '#162033',
      surfaceAlt: '#1d2940',
      card: '#192234',
      cardBorder: '#2a3751',
      text: '#f5f7fb',
      textMuted: '#aab5cb',
      textSoft: '#8895b0',
      primary: '#7dd3fc',
      primaryDeep: '#38bdf8',
      primarySoft: '#14344a',
      secondary: '#c084fc',
      secondarySoft: '#31224a',
      accent: '#fde68a',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#fb7185',
      tabBar: '#121b2b',
      shadow: 'rgba(0, 0, 0, 0.3)',
      input: '#1d2940',
      inputBorder: '#33425f',
      inputText: '#f5f7fb',
      badgeText: '#d8f3ff',
    },
    gradients: {
      hero: ['#172033', '#223557'],
      spotlight: ['#162033', '#1f2942'],
      button: ['#7dd3fc', '#60a5fa', '#c084fc'],
    },
  },
  哆啦A梦主题: {
    name: '哆啦A梦主题',
    dark: false,
    visualStyle: 'illustrated',
    colors: {
      background: '#eef8ff',
      surface: '#f9fdff',
      surfaceAlt: '#dff2ff',
      card: '#fafdff',
      cardBorder: '#c8e5f7',
      text: '#17324d',
      textMuted: '#5f7891',
      textSoft: '#7f95a8',
      primary: '#1f9be6',
      primaryDeep: '#0b74b8',
      primarySoft: '#d6f1ff',
      secondary: '#ffd14b',
      secondarySoft: '#fff2bf',
      accent: '#ff6b6b',
      success: '#2fb66e',
      warning: '#f2ad2e',
      danger: '#dd4c59',
      tabBar: '#f9fdff',
      shadow: 'rgba(31, 155, 230, 0.14)',
      input: '#ffffff',
      inputBorder: '#bfddf1',
      inputText: '#17324d',
      badgeText: '#0b74b8',
    },
    gradients: {
      hero: ['#dff4ff', '#fff9d5'],
      spotlight: ['#f2fbff', '#dbf0ff'],
      button: ['#4bb9f2', '#1f9be6', '#0b74b8'],
    },
  },
  粉色小猪主题: {
    name: '粉色小猪主题',
    dark: false,
    visualStyle: 'illustrated',
    colors: {
      background: '#fff5f8',
      surface: '#fffdfd',
      surfaceAlt: '#ffe9f0',
      card: '#fffafb',
      cardBorder: '#f5cfdc',
      text: '#4e2240',
      textMuted: '#8f6580',
      textSoft: '#b2869e',
      primary: '#ff7da7',
      primaryDeep: '#d94d7e',
      primarySoft: '#ffd9e6',
      secondary: '#ffc2d6',
      secondarySoft: '#fff0f5',
      accent: '#ffb55f',
      success: '#4caf82',
      warning: '#f2a64a',
      danger: '#d84f72',
      tabBar: '#fffafd',
      shadow: 'rgba(233, 115, 157, 0.18)',
      input: '#fffefe',
      inputBorder: '#f2c6d4',
      inputText: '#4e2240',
      badgeText: '#a53f67',
    },
    gradients: {
      hero: ['#ffe1ea', '#fff1ea'],
      spotlight: ['#fff7fa', '#ffe7f0'],
      button: ['#ffa3c0', '#ff7da7', '#d94d7e'],
    },
  },
};

export function getAppTheme(themeName: string): AppTheme {
  return themes[(themeName as ThemeName) || '情侣主题'] ?? themes['情侣主题'];
}

export function getNavigationTheme(appTheme: AppTheme): NavigationTheme {
  return {
    dark: appTheme.dark,
    colors: {
      primary: appTheme.colors.primary,
      background: appTheme.colors.background,
      card: appTheme.colors.tabBar,
      text: appTheme.colors.text,
      border: appTheme.colors.cardBorder,
      notification: appTheme.colors.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  };
}
