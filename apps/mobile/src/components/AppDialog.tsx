import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme/useAppTheme';

export type AppDialogAction = {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
};

type AppDialogOptions = {
  title: string;
  message?: string;
  actions?: AppDialogAction[];
};

type AppDialogContextValue = {
  alert: (title: string, message?: string, actions?: AppDialogAction[]) => void;
  confirm: (options: AppDialogOptions) => void;
  dismiss: () => void;
};

type ActiveDialog = AppDialogOptions | null;

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

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

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  const value = useMemo<AppDialogContextValue>(
    () => ({
      alert: (title, message, actions) => setActiveDialog({ title, message, actions }),
      confirm: (options) => setActiveDialog(options),
      dismiss: () => setActiveDialog(null),
    }),
    [],
  );

  const actions = activeDialog?.actions?.length
    ? activeDialog.actions
    : [{ text: '知道了', style: 'default' as const }];

  const handleActionPress = (action: AppDialogAction) => {
    setActiveDialog(null);
    setTimeout(() => {
      void action.onPress?.();
    }, 80);
  };

  return (
    <AppDialogContext.Provider value={value}>
      <View style={styles.providerRoot}>
        {children}
        {activeDialog ? (
          <View style={styles.centerOverlay}>
            <Pressable
              style={[styles.scrim, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.52)' : 'rgba(36,20,26,0.28)' }]}
              onPress={() => setActiveDialog(null)}
            />
            <View
              style={[
                styles.dialogCard,
                {
                  marginHorizontal: 24,
                  backgroundColor: theme.colors.surface,
                  borderColor: withAlpha(theme.colors.cardBorder, theme.dark ? 0.7 : 0.86),
                  shadowColor: theme.colors.shadow,
                },
              ]}
            >
              <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>{activeDialog.title}</Text>
              {activeDialog.message ? (
                <Text style={[styles.dialogMessage, { color: theme.colors.textMuted }]}>{activeDialog.message}</Text>
              ) : null}

              <View style={styles.actionStack}>
                {actions.map((action, index) => {
                  const destructive = action.style === 'destructive';
                  const cancel = action.style === 'cancel';

                  return (
                    <Pressable
                      key={`${action.text}-${index}`}
                      style={({ pressed }) => [
                        styles.actionButton,
                        {
                          backgroundColor: destructive
                            ? withAlpha(theme.colors.danger, theme.dark ? 0.18 : 0.1)
                            : cancel
                              ? theme.colors.surfaceAlt
                              : withAlpha(theme.colors.primarySoft, theme.dark ? 0.24 : 0.54),
                          borderColor: destructive
                            ? withAlpha(theme.colors.danger, 0.26)
                            : withAlpha(theme.colors.cardBorder, 0.4),
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}
                      onPress={() => handleActionPress(action)}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          {
                            color: destructive
                              ? theme.colors.danger
                              : cancel
                                ? theme.colors.textMuted
                                : theme.colors.primary,
                          },
                        ]}
                      >
                        {action.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const dialog = useContext(AppDialogContext);
  if (!dialog) {
    throw new Error('useAppDialog must be used inside AppDialogProvider');
  }

  return dialog;
}

export function AppDialogSheet({
  visible,
  onClose,
  children,
  style,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.centerOverlay}>
      <Pressable
        style={[styles.scrim, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.52)' : 'rgba(36,20,26,0.28)' }]}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            marginHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 16),
            borderColor: withAlpha(theme.colors.cardBorder, theme.dark ? 0.7 : 0.82),
            shadowColor: theme.colors.shadow,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  providerRoot: {
    flex: 1,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: '88%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 12,
  },
  dialogTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  dialogMessage: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actionStack: {
    marginTop: 20,
    gap: 10,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  sheet: {
    width: '88%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 12,
  },
});
