import { ImageSourcePropType } from 'react-native';

import { ThemeName } from './themes';

type ThemeArtwork = {
  background?: ImageSourcePropType | null;
  hero?: ImageSourcePropType | null;
  heroLogin?: ImageSourcePropType | null;
  card?: ImageSourcePropType | null;
  homeRecommend?: ImageSourcePropType | null;
  tabHome?: ImageSourcePropType | null;
  tabMenu?: ImageSourcePropType | null;
  tabOrders?: ImageSourcePropType | null;
  tabProfile?: ImageSourcePropType | null;
  emptyState?: ImageSourcePropType | null;
  buttonSticker?: ImageSourcePropType | null;
};

export const themeArtwork: Record<ThemeName, ThemeArtwork> = {
  情侣主题: {
    background: null,
    hero: null,
    heroLogin: null,
    card: null,
    homeRecommend: null,
    tabHome: null,
    tabMenu: null,
    tabOrders: null,
    tabProfile: null,
    emptyState: null,
    buttonSticker: null,
  },
  可爱主题: {
    background: null,
    hero: null,
    heroLogin: null,
    card: null,
    homeRecommend: null,
    tabHome: null,
    tabMenu: null,
    tabOrders: null,
    tabProfile: null,
    emptyState: null,
    buttonSticker: null,
  },
  夜间主题: {
    background: null,
    hero: null,
    heroLogin: null,
    card: null,
    homeRecommend: null,
    tabHome: null,
    tabMenu: null,
    tabOrders: null,
    tabProfile: null,
    emptyState: null,
    buttonSticker: null,
  },
  哆啦A梦主题: {
    background: require('../../assets/themes/doraemon-theme-bg-v1.png'),
    hero: require('../../assets/themes/doraemon-hero-main.png'),
    heroLogin: require('../../assets/themes/doraemon-hero-login.png'),
    card: require('../../assets/themes/doraemon-theme-card-preview.png'),
    homeRecommend: require('../../assets/themes/doraemon-home-recommend.png'),
    tabHome: require('../../assets/themes/doraemon-tab-home.png'),
    tabMenu: require('../../assets/themes/doraemon-tab-menu.png'),
    tabOrders: require('../../assets/themes/doraemon-tab-orders.png'),
    tabProfile: require('../../assets/themes/doraemon-tab-profile.png'),
    emptyState: require('../../assets/themes/doraemon-empty-state.png'),
    buttonSticker: require('../../assets/themes/doraemon-button-sticker.png'),
  },
  粉色小猪主题: {
    background: require('../../assets/themes/piggy-theme-bg-v1.png'),
    hero: require('../../assets/themes/piggy-hero-main.png'),
    heroLogin: require('../../assets/themes/piggy-hero-login.png'),
    card: require('../../assets/themes/piggy-theme-card-preview.png'),
    homeRecommend: require('../../assets/themes/piggy-home-recommend.png'),
    tabHome: require('../../assets/themes/piggy-tab-home.png'),
    tabMenu: require('../../assets/themes/piggy-tab-menu.png'),
    tabOrders: require('../../assets/themes/piggy-tab-orders.png'),
    tabProfile: require('../../assets/themes/piggy-tab-profile.png'),
    emptyState: require('../../assets/themes/piggy-empty-state.png'),
    buttonSticker: require('../../assets/themes/piggy-button-sticker.png'),
  },
};

export function getThemeArtwork(themeName: ThemeName) {
  return themeArtwork[themeName];
}
