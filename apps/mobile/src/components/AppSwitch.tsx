import { Switch, SwitchProps } from 'react-native';

import { useAppTheme } from '../theme/useAppTheme';

type AppSwitchProps = SwitchProps & {
  activeColor?: string;
};

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

export function AppSwitch({ activeColor, value, disabled, ...props }: AppSwitchProps) {
  const theme = useAppTheme();
  const resolvedActiveColor = activeColor ?? theme.colors.primary;
  const inactiveTrackColor = theme.dark
    ? withAlpha(theme.colors.primarySoft, 0.34)
    : withAlpha(theme.colors.primarySoft, 0.82);
  const activeTrackColor = withAlpha(resolvedActiveColor, theme.dark ? 0.5 : 0.34);

  return (
    <Switch
      {...props}
      value={value}
      disabled={disabled}
      trackColor={{
        false: inactiveTrackColor,
        true: activeTrackColor,
      }}
      thumbColor={value ? resolvedActiveColor : theme.colors.surface}
      ios_backgroundColor={inactiveTrackColor}
      style={[disabled ? { opacity: 0.48 } : null, props.style]}
    />
  );
}
