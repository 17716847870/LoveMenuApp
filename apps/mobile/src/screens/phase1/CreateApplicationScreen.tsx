import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Heart, Send, Soup, Tags } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDialog } from '../../components/AppDialog';
import { RomanticGradientButton } from '../../components/RomanticGradientButton';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppStore } from '../../store/appStore';
import { useAppTheme } from '../../theme/useAppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateApplication'>;

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

export function CreateApplicationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useAppDialog();
  const { currentUser, loadBootstrap } = useAppStore();
  const [dishName, setDishName] = useState('');
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!dishName.trim()) {
      dialog.alert('还差一点', '先写下你想吃的菜名吧');
      return;
    }

    setIsSubmitting(true);
    try {
      await phaseOneApi.createMenuRequest({
        title: dishName.trim(),
        description: reason.trim() || null,
        suggested_category_name: category.trim() || null,
      });
      if (currentUser) {
        await loadBootstrap(currentUser.id);
      }
      dialog.alert('心愿已提交', '我已经把这份想吃的心意记下来了');
      navigation.goBack();
    } catch {
      dialog.alert('提交失败', '请确认你们已经完成绑定，并且当前身份可以发起心愿');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader title="美食心愿" subtitle="把想吃的味道记录下来" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 116, 132) }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
              shadowColor: withAlpha(theme.colors.primary, 0.18),
              gap: 12,
            },
          ]}
        >
          <View style={[styles.blurBlob, { backgroundColor: withAlpha(theme.colors.primarySoft, 0.2) }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.secondary }]}>
              <Soup size={14} color={theme.colors.secondary} strokeWidth={2.1} /> 菜品名称
            </Text>
            <TextInput
              value={dishName}
              onChangeText={setDishName}
              placeholder="例如：番茄牛腩炖土豆"
              placeholderTextColor={theme.colors.textSoft}
              style={[styles.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.secondary }]}>
              <Tags size={14} color={theme.colors.secondary} strokeWidth={2.1} /> 推荐分类
            </Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="可选，例如：主菜、甜点、饮品..."
              placeholderTextColor={theme.colors.textSoft}
              style={[styles.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
              shadowColor: withAlpha(theme.colors.primary, 0.18),
            },
          ]}
        >
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.secondary }]}>
              <Heart size={14} color={theme.colors.secondary} strokeWidth={2.1} /> 想吃的原因
            </Text>
            <TextInput
              multiline
              value={reason}
              onChangeText={setReason}
              placeholder="是因为看了某部电影，还是突然怀念某种味道？写下你想吃它的小心思..."
              placeholderTextColor={theme.colors.textSoft}
              style={[styles.textarea, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) + 14 }]}>
        <RomanticGradientButton
          title={isSubmitting ? '提交中...' : '提交心愿'}
          onPress={handleSubmit}
          icon={<Send size={18} color="#ffffff" strokeWidth={2.2} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  topCopy: { alignItems: 'center', marginBottom: 24 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  blurBlob: { position: 'absolute', top: -40, right: -30, width: 128, height: 128, borderRadius: 64 },
  field: { gap: 8 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  input: { borderRadius: 12, paddingHorizontal: 16, minHeight: 52, fontSize: 14, lineHeight: 20 },
  textarea: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    minHeight: 112,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
