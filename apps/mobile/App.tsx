import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDialogProvider } from './src/components/AppDialog';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppDialogProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AppDialogProvider>
    </SafeAreaProvider>
  );
}
