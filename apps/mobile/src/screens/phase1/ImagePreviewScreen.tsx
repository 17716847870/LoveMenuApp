import { ImageBackground, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FloatingBackButton } from '../../components/FloatingBackButton';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ImagePreview'>;

const fallbackImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAvvuK3gskqxW9JLvheis_VSBzV9OXqqOmndh5nvcREYpwOHsO_X8ceoUVfzqJTaNd3SOHjRtN_ERRBjQj_Kw1cuWWz94DOus1K-MenTWEQ0HMTjkBPvX609RKzbNNntiPpWyP6x33qyNUM0EizvZ5pxsov4fL5jC9ONPU_0DFXR1IDX4lay-GdkGbYRvPZNhTNjCK0Xki1r28EQNvz-tTOlEC3I2_P0FPDcOMw5tO6_2pru4GSYHyrabrORDTz4GznzOIQ2DorhKM';

export function ImagePreviewScreen({ route, navigation }: Props) {
  const imageUri = route.params?.imageUri ?? fallbackImage;

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: imageUri }} style={styles.image} resizeMode="contain">
        <FloatingBackButton onPress={() => navigation.goBack()} />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  image: {
    flex: 1,
  },
});
