import { create } from 'zustand';

import { clearAuthToken, loadAuthToken, setAuthToken } from '../services/apiClient';
import { notificationApi } from '../services/notificationApi';
import { periodApi } from '../services/periodApi';
import { phaseOneApi } from '../services/phaseOneApi';
import { registerDevicePushToken, syncLocalNotificationSchedules } from '../services/pushNotifications';
import { ThemeName } from '../theme/themes';
import {
  BootstrapResponse,
  CoupleInviteEntity,
  CoupleRelationshipEntity,
  MenuCategoryEntity,
  MenuEntity,
  OrderEntity,
  UserEntity,
} from '../types/phaseOne';

type PreviewRole = 'publisher' | 'consumer';

export type AppNotificationSettings = {
  chatMessages: boolean;
  menuApplications: boolean;
  anniversaryReminders: boolean;
  periodReminders: boolean;
  quietHours: boolean;
};

type AppState = {
  activeTheme: ThemeName;
  notificationSettings: AppNotificationSettings;
  currentUser: UserEntity | null;
  partnerUser: UserEntity | null;
  relationship: CoupleRelationshipEntity | null;
  coupleInvites: CoupleInviteEntity[];
  nextStep: BootstrapResponse['next_step'] | null;
  menuCategories: MenuCategoryEntity[];
  menus: MenuEntity[];
  orders: OrderEntity[];
  isAuthenticated: boolean;
  previewRole: PreviewRole;
  setTheme: (theme: ThemeName) => void;
  setNotificationSetting: <Key extends keyof AppNotificationSettings>(
    key: Key,
    value: AppNotificationSettings[Key],
  ) => Promise<void>;
  setPreviewRole: (role: PreviewRole) => void;
  login: (phone: string) => Promise<void>;
  loginWithCode: (phone: string, code: string) => Promise<void>;
  loginWithPassword: (phone: string, password: string) => Promise<void>;
  restoreSession: () => Promise<boolean>;
  loadBootstrap: (userId?: number) => Promise<void>;
  loadNotificationSettings: () => Promise<void>;
  updateProfile: (payload: Partial<Pick<UserEntity, 'nickname' | 'phone' | 'email' | 'avatar_url'>>) => Promise<void>;
  completeRegistrationProfile: (payload: {
    nickname: string;
    password?: string;
    avatar_url?: string | null;
    gender: NonNullable<UserEntity['gender']>;
  }) => Promise<void>;
  updateOnboardingProfile: (role: NonNullable<UserEntity['preferred_role']>) => Promise<void>;
  resetPreferredRole: () => Promise<void>;
  unbindRelationship: () => Promise<void>;
  logout: () => void;
};

function applyBootstrap(set: (partial: Partial<AppState>) => void, bootstrap: BootstrapResponse) {
  set({
    currentUser: bootstrap.current_user,
    partnerUser: bootstrap.partner_user,
    relationship: bootstrap.couple_relationship,
    coupleInvites: bootstrap.couple_invites,
    nextStep: bootstrap.next_step,
    menuCategories: bootstrap.menu_categories,
    menus: bootstrap.menus,
    orders: bootstrap.orders,
    isAuthenticated: true,
  });
  void registerDevicePushToken();
}

async function applyAuthenticatedSession(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  token: string,
) {
  await setAuthToken(token);
  const { data: bootstrap } = await phaseOneApi.getBootstrap();
  applyBootstrap(set, bootstrap);
  await get().loadNotificationSettings();
  const role =
    bootstrap.couple_relationship?.publisher_user_id === bootstrap.current_user.id ? 'publisher' : 'consumer';
  get().setPreviewRole(role);
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTheme: '情侣主题',
  notificationSettings: {
    chatMessages: true,
    menuApplications: true,
    anniversaryReminders: true,
    periodReminders: true,
    quietHours: false,
  },
  currentUser: null,
  partnerUser: null,
  relationship: null,
  coupleInvites: [],
  nextStep: null,
  menuCategories: [],
  menus: [],
  orders: [],
  isAuthenticated: false,
  previewRole: 'publisher',
  setTheme: (theme) => set({ activeTheme: theme }),
  setNotificationSetting: (key, value) =>
    (async () => {
      const previousSettings = get().notificationSettings;
      const nextSettings = {
        ...previousSettings,
        [key]: value,
      };
      set({ notificationSettings: nextSettings });
      try {
        const { data } = await notificationApi.updateSettings({ [key]: value });
        set({ notificationSettings: data });
        void syncLocalNotificationSchedules(data);
      } catch {
        set({ notificationSettings: previousSettings });
      }
    })(),
  setPreviewRole: (role) => set({ previewRole: role }),
  login: async (phone) => {
    const { data: auth } = await phaseOneApi.login(phone);
    await applyAuthenticatedSession(set, get, auth.token);
  },
  loginWithCode: async (phone, code) => {
    const { data: auth } = await phaseOneApi.loginWithCode(phone, code);
    await applyAuthenticatedSession(set, get, auth.token);
  },
  loginWithPassword: async (phone, password) => {
    const { data: auth } = await phaseOneApi.loginWithPassword(phone, password);
    await applyAuthenticatedSession(set, get, auth.token);
  },
  restoreSession: async () => {
    const token = await loadAuthToken();
    if (!token) {
      get().logout();
      return false;
    }

    try {
      const { data: auth } = await phaseOneApi.refreshSession();
      await setAuthToken(auth.token);
      const { data: bootstrap } = await phaseOneApi.getBootstrap();
      applyBootstrap(set, bootstrap);
      await get().loadNotificationSettings();
      const role = bootstrap.couple_relationship?.publisher_user_id === auth.user.id ? 'publisher' : 'consumer';
      get().setPreviewRole(role);
      return true;
    } catch {
      get().logout();
      return false;
    }
  },
  loadBootstrap: async () => {
    const { data: bootstrap } = await phaseOneApi.getBootstrap();
    applyBootstrap(set, bootstrap);
    await get().loadNotificationSettings();
    const role =
      bootstrap.couple_relationship?.publisher_user_id === bootstrap.current_user.id ? 'publisher' : 'consumer';
    get().setPreviewRole(role);
  },
  loadNotificationSettings: async () => {
    try {
      const { data } = await notificationApi.getSettings();
      set({ notificationSettings: data });
      void syncLocalNotificationSchedules(data);
    } catch {
      void syncLocalNotificationSchedules(get().notificationSettings);
    }
  },
  updateProfile: async (payload) => {
    const { currentUser } = get();
    if (!currentUser) {
      return;
    }

    await phaseOneApi.updateUser(payload);
    const { data: bootstrap } = await phaseOneApi.getBootstrap();
    applyBootstrap(set, bootstrap);
  },
  completeRegistrationProfile: async (payload) => {
    const { currentUser } = get();
    if (!currentUser) {
      return;
    }

    await phaseOneApi.completeRegistrationProfile(payload);
    const { data: bootstrap } = await phaseOneApi.getBootstrap();
    applyBootstrap(set, bootstrap);
  },
  updateOnboardingProfile: async (role) => {
    const { currentUser } = get();
    if (!currentUser) {
      return;
    }

    await phaseOneApi.updateUser({ preferred_role: role });
    const { data: bootstrap } = await phaseOneApi.getBootstrap();
    applyBootstrap(set, bootstrap);
  },
  resetPreferredRole: async () => {
    const { currentUser } = get();
    if (!currentUser) {
      return;
    }

    await phaseOneApi.updateUser({ preferred_role: null });
    const { data: bootstrap } = await phaseOneApi.getBootstrap();
    applyBootstrap(set, bootstrap);
  },
  unbindRelationship: async () => {
    const { currentUser, relationship } = get();
    if (!currentUser || !relationship) {
      return;
    }

    await phaseOneApi.unbindRelationship(relationship.id);
    const { data: bootstrap } = await phaseOneApi.getBootstrap();
    applyBootstrap(set, bootstrap);
  },
  logout: () => {
    void clearAuthToken();
    void periodApi.resetSelectedRecordDate();
    set({
      currentUser: null,
      partnerUser: null,
      relationship: null,
      coupleInvites: [],
      nextStep: null,
      menuCategories: [],
      menus: [],
      orders: [],
      isAuthenticated: false,
      previewRole: 'publisher',
    });
  },
}));
