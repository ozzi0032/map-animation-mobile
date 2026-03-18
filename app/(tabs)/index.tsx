import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors, BG } from '../../src/constants/colors';
import { templateApi, type TemplateItem, type TemplateListParams } from '../../src/api/templateApi';
import { useTemplateStore } from '../../src/store/templateStore';
import { TemplateDetailModal } from '../../src/components/templates/TemplateDetailModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_H_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_H_PADDING * 2 - CARD_GAP) / 2;

const FILTER_TABS: Array<{ label: string; value: TemplateListParams['filterType'] }> = [
  { label: 'All',       value: 'all'       },
  { label: 'Favorites', value: 'favorites' },
];

const PAGE_SIZE = 20;

export default function TemplatesScreen() {
  const router = useRouter();
  const { setPendingPrompt, recordView, viewDeltas, useDeltas, getLikeState } = useTemplateStore();

  // Filter / search
  const [activeFilter, setActiveFilter] = useState<TemplateListParams['filterType']>('all');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // List state
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Modal
  const [modalTemplate, setModalTemplate] = useState<TemplateItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Debounced search ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  // ── Load templates ──
  const loadTemplates = useCallback(
    async (page: number, replace: boolean) => {
      if (page === 1) {
        replace ? setLoading(true) : setRefreshing(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const result = await templateApi.getAll({
          filterType: activeFilter,
          searchTerm: debouncedSearch || undefined,
          page,
          pageSize: PAGE_SIZE,
          sortBy: 'date',
          sortOrder: 'desc',
        });
        setItems((prev) => (page === 1 ? result.items : [...prev, ...result.items]));
        setCurrentPage(result.currentPage);
        setHasNextPage(result.hasNextPage);
        setTotalCount(result.totalCount);
      } catch {
        // silently fail — keep existing items
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeFilter, debouncedSearch]
  );

  // Reload when filter or search changes
  useEffect(() => {
    loadTemplates(1, true);
  }, [activeFilter, debouncedSearch]);

  const handleRefresh = () => loadTemplates(1, false);

  const handleLoadMore = () => {
    if (!loadingMore && hasNextPage) {
      loadTemplates(currentPage + 1, false);
    }
  };

  // ── Tap template card ──
  const handleCardTap = (item: TemplateItem) => {
    recordView(item.id);
    setModalTemplate(item);
    setModalVisible(true);
  };

  // ── Modal "Use This Template" ──
  const handleModalUse = useCallback(
    (prompt: string, templateId: number) => {
      setPendingPrompt(prompt, templateId);
      setModalVisible(false);
      router.push('/(tabs)/create');
    },
    [setPendingPrompt]
  );

  // ── Render template card ──
  const renderItem = useCallback(
    ({ item, index }: { item: TemplateItem; index: number }) => {
      const isLeft = index % 2 === 0;
      const effectiveView = item.viewCounter + (viewDeltas[item.id] ?? 0);
      const effectiveUse = item.usedCounter + (useDeltas[item.id] ?? 0);
      const { likedCount } = getLikeState(item.id, item.isLikedByCurrentUser, item.likedCounter);
      return (
        <TouchableOpacity
          style={[styles.card, isLeft ? { marginRight: CARD_GAP / 2 } : { marginLeft: CARD_GAP / 2 }]}
          onPress={() => handleCardTap(item)}
          activeOpacity={0.8}
        >
          {/* Thumbnail */}
          <View style={styles.cardThumbContainer}>
            {item.thumbnailUrl ? (
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={styles.cardThumb}
                contentFit="cover"
                transition={250}
              />
            ) : (
              <View style={[styles.cardThumb, styles.cardThumbEmpty]}>
                <Text style={styles.cardThumbEmptyIcon}>🗺️</Text>
                <Text style={styles.cardThumbEmptyText}>No Preview</Text>
              </View>
            )}
            {/* Badges */}
            <View style={styles.badgeRow}>
              {item.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
              <View style={styles.ratioBadge}>
                <Text style={styles.ratioBadgeText}>{item.aspectRatio}</Text>
              </View>
            </View>
          </View>

          {/* Info */}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.cardStatsRow}>
              <Text style={styles.cardStat}>👁 {formatCount(effectiveView)}</Text>
              <Text style={styles.cardStat}>▶ {formatCount(effectiveUse)}</Text>
              <Text style={styles.cardStat}>❤ {formatCount(likedCount)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [viewDeltas, useDeltas, getLikeState]
  );

  const ListEmptyComponent = loading ? null : (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🗺️</Text>
      <Text style={styles.emptyTitle}>No templates found</Text>
      <Text style={styles.emptyDesc}>
        {debouncedSearch
          ? 'Try a different search term'
          : activeFilter === 'favorites'
          ? 'Like templates to save them here'
          : 'No templates available yet'}
      </Text>
    </View>
  );

  const ListFooterComponent = loadingMore ? (
    <View style={styles.loadMoreIndicator}>
      <ActivityIndicator color={Colors.primary} size="small" />
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Templates</Text>
          {totalCount > 0 && !loading && (
            <Text style={styles.headerCount}>{totalCount} templates</Text>
          )}
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            placeholderTextColor={Colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => {
          const active = activeFilter === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Grid ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading templates…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          extraData={{ viewDeltas, useDeltas }}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* ── Modal ── */}
      <TemplateDetailModal
        visible={modalVisible}
        template={modalTemplate}
        onClose={() => setModalVisible(false)}
        onUse={handleModalUse}
      />
    </SafeAreaView>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerCount: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },

  // ── Search ──
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: { padding: 4 },
  clearBtnText: { color: Colors.textMuted, fontSize: 12 },

  // ── Filter tabs ──
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: Colors.surface,
  },
  filterTabActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.borderAccent,
  },
  filterTabText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  filterTabTextActive: {
    color: Colors.primary,
  },

  // ── Grid ──
  grid: {
    paddingHorizontal: CARD_H_PADDING,
    paddingBottom: 20,
  },
  gridRow: {
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  cardThumbContainer: {
    position: 'relative',
  },
  cardThumb: {
    width: '100%',
    height: CARD_WIDTH * 0.62,
  },
  cardThumbEmpty: {
    height: CARD_WIDTH * 0.62,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardThumbEmptyIcon: { fontSize: 26 },
  cardThumbEmptyText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  badgeRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    gap: 4,
  },
  newBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: Colors.white,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ratioBadge: {
    backgroundColor: 'rgba(7,9,19,0.72)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ratioBadgeText: {
    color: Colors.textSecondary,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 6,
  },
  cardStatsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardStat: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },

  // ── Loading / Empty ──
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  emptyState: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  loadMoreIndicator: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
