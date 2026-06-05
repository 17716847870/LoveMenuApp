import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Heart, PenLine, Plus, UtensilsCrossed } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundIconAction } from '../../components/RoundIconAction';
import { SecondaryPageHeader } from '../../components/SecondaryPageHeader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { phaseOneApi } from '../../services/phaseOneApi';
import { useAppTheme } from '../../theme/useAppTheme';
import { SpacePostEntity } from '../../types/phaseOne';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

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

function formatTimelineStamp(value: string) {
  const date = new Date(value);
  const period = date.getHours() >= 12 ? '下午' : '上午';
  const hour = date.getHours() % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${date.getMonth() + 1}月 ${date.getDate()}日 · ${period} ${hour}:${minute}`;
}

function getPostTimeValue(post: SpacePostEntity) {
  return post.record_date ?? post.posted_at;
}

function groupPostsByYear(posts: SpacePostEntity[]) {
  const groups = new Map<string, SpacePostEntity[]>();

  posts.forEach((post) => {
    const year = String(new Date(getPostTimeValue(post)).getFullYear());
    groups.set(year, [...(groups.get(year) ?? []), post]);
  });

  return Array.from(groups.entries()).map(([year, items]) => ({ year, items }));
}

export function TimelineScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [posts, setPosts] = useState<SpacePostEntity[]>([]);
  const panelBorder = theme.dark ? withAlpha(theme.colors.cardBorder, 0.36) : withAlpha(theme.colors.cardBorder, 0.42);
  const yearGroups = useMemo(() => groupPostsByYear(posts), [posts]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      phaseOneApi
        .listSpacePosts()
        .then((response) => {
          if (active) {
            setPosts(response.data);
          }
        })
        .catch((error) => {
          if (active) {
            Alert.alert('加载失败', error instanceof Error ? error.message : '无法获取我们的时光。');
          }
        });

      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SecondaryPageHeader
        title="我们的时光"
        subtitle="点滴瞬间，皆是温柔"
        onBack={() => navigation.goBack()}
        icon={<Heart size={22} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2.2} />}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 10, paddingBottom: Math.max(insets.bottom + 40, 56) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineWrap}>
          <View
            pointerEvents="none"
            style={[
              styles.axis,
              {
                backgroundColor: withAlpha(theme.colors.primarySoft, 0.55),
              },
            ]}
          />

          {posts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: panelBorder }]}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>还没有时光记录</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                发布动态或完成订单反馈后，会自动沉淀在这里。
              </Text>
            </View>
          ) : null}

          {yearGroups.map((group) => (
            <View key={group.year} style={styles.yearGroup}>
              <View style={styles.yearHeader}>
                <View
                  style={[
                    styles.yearNode,
                    {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.surface,
                      shadowColor: withAlpha(theme.colors.primary, 0.28),
                    },
                  ]}
                />
                <View
                  style={[
                    styles.yearPill,
                    {
                      backgroundColor: theme.colors.secondarySoft,
                      borderColor: withAlpha(theme.colors.primarySoft, 0.55),
                    },
                  ]}
                >
                  <Text style={[styles.yearText, { color: theme.colors.primary }]}>{group.year}</Text>
                </View>
              </View>

              {group.items.map((item) => {
                const imageUrls = item.images.map((image) => image.image_url).filter(Boolean);
                const coverImage = imageUrls[0];
                const text = item.content_text ?? '';
                const isOrder = item.post_type === 'order_feedback';

                return (
                  <View key={item.id} style={styles.timelineItem}>
                    <View
                      style={[
                        styles.node,
                        {
                          backgroundColor: isOrder
                            ? theme.colors.secondarySoft
                            : coverImage
                              ? theme.colors.primarySoft
                              : withAlpha(theme.colors.secondary, 0.24),
                          borderColor: theme.colors.surface,
                        },
                      ]}
                    />

                    <Text style={[styles.stamp, { color: theme.colors.textMuted }]}>
                      {formatTimelineStamp(getPostTimeValue(item))}
                    </Text>

                    <View
                      style={[
                        styles.card,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: panelBorder,
                          shadowColor: withAlpha(theme.colors.primary, 0.12),
                        },
                      ]}
                    >
                      {!isOrder && coverImage ? (
                        <>
                          {text ? <Text style={[styles.bodyText, { color: theme.colors.text }]}>{text}</Text> : null}
                          <ImageGrid
                            imageUrls={imageUrls}
                            caption={text}
                            onPreview={(imageUri) => navigation.navigate('ImagePreview', { imageUri, caption: text })}
                          />
                        </>
                      ) : null}

                      {isOrder ? (
                        <>
                          <View style={styles.orderHeader}>
                            <View style={[styles.orderIconWrap, { backgroundColor: theme.colors.secondarySoft }]}>
                              <UtensilsCrossed size={16} color={theme.colors.primary} strokeWidth={2.1} />
                            </View>
                            <View>
                              <Text style={[styles.orderTitle, { color: theme.colors.text }]}>
                                {item.title ?? '订单反馈'}
                              </Text>
                              <View style={styles.orderHearts}>
                                {new Array(5).fill(0).map((_, heartIndex) => (
                                  <Heart
                                    key={`${item.id}-${heartIndex}`}
                                    size={12}
                                    color={theme.colors.primarySoft}
                                    fill={theme.colors.primarySoft}
                                    strokeWidth={2}
                                  />
                                ))}
                              </View>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.quote,
                              { color: theme.colors.textMuted, borderLeftColor: theme.colors.primarySoft },
                            ]}
                          >
                            {text ? `“${text}”` : '这次订单已经完成，甜蜜记录已同步到我们的时光。'}
                          </Text>
                          {coverImage ? (
                            <ImageGrid
                              imageUrls={imageUrls}
                              caption={text}
                              style={styles.orderPhotoWrap}
                              onPreview={(imageUri) => navigation.navigate('ImagePreview', { imageUri, caption: text })}
                            />
                          ) : null}
                        </>
                      ) : null}

                      {!isOrder && !coverImage ? (
                        <View style={styles.noteRow}>
                          <PenLine size={18} color={theme.colors.textMuted} strokeWidth={2.1} />
                          <Text style={[styles.noteText, { color: theme.colors.text }]}>{text}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={[styles.endDot, { backgroundColor: withAlpha(theme.colors.cardBorder, 0.5) }]} />
        </View>
      </ScrollView>
      <RoundIconAction
        floating
        icon={<Plus size={22} color="#ffffff" strokeWidth={2.4} />}
        onPress={() => navigation.navigate('PostToSpace')}
      />
    </View>
  );
}

function ImageGrid({
  imageUrls,
  onPreview,
  style,
}: {
  imageUrls: string[];
  caption: string;
  onPreview: (imageUri: string) => void;
  style?: object;
}) {
  const displayImages = imageUrls.slice(0, 9);
  const single = displayImages.length === 1;

  return (
    <View style={[single ? styles.singlePhotoGrid : styles.photoGrid, style]}>
      {displayImages.map((imageUri, index) => {
        const hiddenCount = imageUrls.length - displayImages.length;
        const showMore = hiddenCount > 0 && index === displayImages.length - 1;

        return (
          <Pressable
            key={`${imageUri}-${index}`}
            style={single ? styles.photoWrap : styles.gridPhotoWrap}
            onPress={() => onPreview(imageUri)}
          >
            <Image source={{ uri: imageUri }} style={single ? styles.photo : styles.gridPhoto} />
            <View style={styles.photoOverlay} />
            {showMore ? (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{hiddenCount}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingRight: 24,
  },
  headerInner: {
    height: 64,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBack: {
    left: 24,
  },
  content: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  timelineWrap: {
    position: 'relative',
    paddingLeft: 24,
  },
  axis: {
    position: 'absolute',
    left: 10,
    top: 8,
    bottom: 0,
    width: 2,
    borderRadius: 999,
  },
  timelineItem: {
    marginBottom: 28,
  },
  yearGroup: {
    marginBottom: 6,
  },
  yearHeader: {
    minHeight: 40,
    marginBottom: 12,
    justifyContent: 'center',
  },
  yearNode: {
    position: 'absolute',
    left: -24,
    top: 11,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  yearPill: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  node: {
    position: 'absolute',
    left: -20,
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  stamp: {
    marginBottom: 8,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  bodyText: {
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 22,
  },
  photoWrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  singlePhotoGrid: {
    width: '100%',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridPhotoWrap: {
    width: '31.9%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 192,
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19, 23, 35, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  orderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  orderHearts: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 2,
  },
  quote: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  orderPhotoWrap: {
    marginTop: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    marginBottom: 28,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  endDot: {
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 4,
  },
});
