import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Heart } from 'lucide-react-native';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAppStore } from '../../store/appStore';
import { routeForNextStep } from '../../utils/onboarding';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const palette = {
  background: '#fbf9f5',
  surface: '#ffffff',
  primary: '#894c5c',
  primaryContainer: '#f4a7b9',
  secondaryContainer: '#f8d8d5',
  outlineSoft: 'rgba(248,216,213,0.5)',
  slogan: 'rgba(82,67,70,0.8)',
  ambient: 'rgba(255,255,255,0.4)',
};

export function SplashScreen({ navigation }: Props) {
  const restoreSession = useAppStore((state) => state.restoreSession);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      void restoreSession().then((restored) => {
        if (!mounted) {
          return;
        }

        if (!restored) {
          navigation.replace('Login');
          return;
        }

        const nextStep = useAppStore.getState().nextStep ?? 'select_role';
        navigation.replace(routeForNextStep(nextStep));
      });
    }, 900);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [navigation, restoreSession]);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.backgroundOverlay}>
        <View style={[styles.glowTop, { backgroundColor: 'rgba(244,167,185,0.2)' }]} />
        <View style={[styles.glowBottom, { backgroundColor: 'rgba(248,216,213,0.3)' }]} />
        <View style={styles.ambientWrap}>
          <View style={[styles.ambientCore, { backgroundColor: palette.ambient }]} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.logoBlock}>
          <View style={styles.logoOrb}>
            <View style={styles.logoStroke} />
            <Heart size={42} color={palette.primary} fill={palette.primary} strokeWidth={1.8} />
          </View>
        </View>

        <Text style={styles.brand}>LoveMenu</Text>
        <Text style={styles.desc}>情牵一线，味暖心间</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    overflow: 'hidden',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    borderRadius: 999,
    width: 384,
    height: 384,
    top: -80,
    right: -80,
  },
  glowBottom: {
    position: 'absolute',
    borderRadius: 999,
    width: 320,
    height: 320,
    bottom: -80,
    left: -80,
  },
  ambientWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientCore: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    transform: [{ scaleX: 1.1 }, { scaleY: 0.72 }],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
  },
  logoBlock: {
    marginBottom: 12,
  },
  logoOrb: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: 'rgba(244,167,185,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 8,
  },
  logoStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.outlineSoft,
  },
  brand: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    color: palette.primary,
    letterSpacing: -0.56,
    textAlign: 'center',
  },
  desc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: palette.slogan,
    letterSpacing: 2.4,
    textAlign: 'center',
  },
});
