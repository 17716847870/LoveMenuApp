import { TextInput, TextInputProps, View } from 'react-native';

import { useAppTheme } from '../theme/useAppTheme';

export function AppTextInput(props: TextInputProps) {
  const theme = useAppTheme();

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        backgroundColor: theme.colors.input,
        borderRadius: 18,
        paddingHorizontal: 16,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 2,
      }}
    >
      <TextInput
        placeholderTextColor={theme.colors.textSoft}
        style={{
          minHeight: 54,
          color: theme.colors.inputText,
          fontSize: 16,
          paddingVertical: 14,
        }}
        {...props}
      />
    </View>
  );
}
