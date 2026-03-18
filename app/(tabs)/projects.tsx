import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors, BG } from '../../src/constants/colors';
import { useProjectStore } from '../../src/store/projectStore';
import { ProjectDetailModal } from '../../src/components/projects/ProjectDetailModal';
import { useProjectSignalR } from '../../src/hooks/useSignalR';
import type { ProjectItem } from '../../src/api/projectApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 10;
const SIDE_PAD = 16;
const CARD_WIDTH = (SCREEN_WIDTH - SIDE_PAD * 2 - COLUMN_GAP) / 2;
const CARD_THUMB_HEIGHT = Math.round(CARD_WIDTH * 0.65);

// ── Status helpers ─────────────────────────────────────────────────────────────

function getCardStatus(item: ProjectItem): {
  label: string;
  color: string;
  pulse: boolean;
} {
  if (item.isCompleted) return { label: 'Done', color: Colors.success, pulse: false };
  if (item.isFailed) return { label: 'Failed', color: Colors.error, pulse: false };
  if (item.isProcessing || item.jobStatus === 'Rendering') {
    return { label: 'Processing', color: Colors.primary, pulse: true };
  }
  return { label: 'Pending', color: Colors.warning, pulse: true };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ item }: { item: ProjectItem }) {
  const { label, color, pulse } = getCardStatus(item);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 680, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 680, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}22` }]}>
      {pulse ? (
        <Animated.View style={[styles.statusDot, { backgroundColor: color, opacity: pulseAnim }]} />
      ) : (
        <View style={[styles.statusDot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SkeletonCard() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: anim }]}>
      <View style={[styles.cardThumb, { height: CARD_THUMB_HEIGHT, backgroundColor: Colors.surfaceHigh }]} />
      <View style={styles.cardContent}>
        <View style={[styles.skeletonLine, { width: 56, height: 14, borderRadius: 7 }]} />
        <View style={[styles.skeletonLine, { width: '82%', height: 11, marginTop: 2 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 9, marginTop: 2 }]} />
      </View>
    </Animated.View>
  );
}

function ProjectCard({
  item,
  onPress,
}: {
  item: ProjectItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityLabel={`Open project: ${item.title}`}
    >
      <View style={[styles.cardThumb, { height: CARD_THUMB_HEIGHT }]}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={styles.cardThumbPlaceholder}>
            <Text style={styles.cardThumbPlaceholderIcon}>🎬</Text>
          </View>
        )}

        {/* Favorite indicator */}
        {item.isFavorite && (
          <View style={styles.favIndicator}>
            <Text style={styles.favIndicatorIcon}>⭐</Text>
          </View>
        )}

        {/* Aspect badge */}
        <View style={styles.cardAspectBadge}>
          <Text style={styles.cardAspectBadgeText}>{item.aspectRatio}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <StatusBadge item={item} />
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardDate} numberOfLines={1}>
          {item.modifiedTimeAgo}
        </Text>
        {item.isCompleted && item.downloadCounter > 0 && (
          <Text style={styles.cardDownloads}>⬇ {item.downloadCounter}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({
  filter,
  onCreate,
}: {
  filter: 'all' | 'favorites';
  onCreate: () => void;
}) {
  const isFav = filter === 'favorites';
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>{isFav ? '⭐' : '🎬'}</Text>
      </View>
      <Text style={styles.emptyTitle}>
        {isFav ? 'No favorites yet' : 'No projects yet'}
      </Text>
      <Text style={styles.emptyDesc}>
        {isFav
          ? 'Star your animations to find them quickly here.'
          : 'Your created animations will appear here.\nHead to Create to make your first one.'}
      </Text>
      {!isFav && (
        <TouchableOpacity style={styles.emptyCTA} onPress={onCreate} activeOpacity={0.82}>
          <Text style={styles.emptyCTAText}>⚡  Create Animation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const router = useRouter();

  const {
    projects,
    loading,
    refreshing,
    loadingMore,
    error,
    filter,
    loadProjects,
    refreshProjects,
    loadMoreProjects,
    setFilter,
    setSearchTerm,
    openDetail,
  } = useProjectStore();

  const [detailVisible, setDetailVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect SignalR for real-time status updates
  useProjectSignalR();

  // Load on tab focus
  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchInput(text);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        setSearchTerm(text);
      }, 400);
    },
    [setSearchTerm]
  );

  const handleCardPress = useCallback(
    async (id: number) => {
      setDetailVisible(true);
      await openDetail(id);
    },
    [openDetail]
  );

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ProjectItem }) => (
      <ProjectCard item={item} onPress={() => handleCardPress(item.id)} />
    ),
    [handleCardPress]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    );
  }, [loadingMore]);

  const keyExtractor = useCallback((item: ProjectItem) => String(item.id), []);

  const showSkeletons = loading && projects.length === 0;
  const isEmpty = !loading && !error && projects.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        {projects.length > 0 && (
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountText}>{projects.length}</Text>
          </View>
        )}
      </View>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={handleSearchChange}
            placeholder="Search projects…"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search projects"
          />
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.filterRow}>
        {(['all', 'favorites'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
            activeOpacity={0.75}
            accessibilityLabel={tab === 'all' ? 'All projects' : 'Favorite projects'}
          >
            <Text
              style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}
            >
              {tab === 'all' ? 'All' : '⭐ Favorites'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Error banner ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠ {error}</Text>
          <TouchableOpacity onPress={loadProjects}>
            <Text style={styles.errorBannerRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Skeleton loaders ── */}
      {showSkeletons && (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <EmptyState
          filter={filter}
          onCreate={() => router.push('/(tabs)/create' as any)}
        />
      )}

      {/* ── Projects grid ── */}
      {!showSkeletons && projects.length > 0 && (
        <FlatList
          data={projects}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreProjects}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshProjects}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Detail modal ── */}
      <ProjectDetailModal visible={detailVisible} onClose={handleCloseDetail} />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerCountBadge: {
    backgroundColor: Colors.primaryDim,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerCountText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Search
  searchRow: {
    paddingHorizontal: SIDE_PAD,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  filterTabActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.borderAccent,
  },
  filterTabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: Colors.primary,
  },

  // Error
  errorBanner: {
    marginHorizontal: SIDE_PAD,
    marginBottom: 10,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: { color: Colors.error, fontSize: 13 },
  errorBannerRetry: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  // Grid
  listContent: {
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 24,
    gap: COLUMN_GAP,
  },
  columnWrapper: {
    gap: COLUMN_GAP,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 5,
  },
  cardThumb: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    position: 'relative',
  },
  cardThumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardThumbPlaceholderIcon: { fontSize: 30 },
  favIndicator: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(4,7,16,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favIndicatorIcon: { fontSize: 10 },
  cardAspectBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(4,7,16,0.78)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardAspectBadgeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 10,
    gap: 3,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  cardDate: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  cardDownloads: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },

  // Status badge (on card)
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
    marginBottom: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Skeleton
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIDE_PAD,
    paddingTop: 4,
    gap: COLUMN_GAP,
  },
  skeletonLine: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 6,
  },

  // Footer loader
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: -40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyCTA: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 6,
  },
  emptyCTAText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
