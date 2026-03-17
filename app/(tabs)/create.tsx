import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Colors, BG } from '../../src/constants/colors';
import { animationApi, type CreditsInfo, type AspectRatioConfig } from '../../src/api/animationApi';
import { templateApi, type TemplateItem } from '../../src/api/templateApi';
import { useTemplateStore } from '../../src/store/templateStore';
import { TemplateDetailModal } from '../../src/components/templates/TemplateDetailModal';

// ─── Constants ───────────────────────────────────────────
const ASPECT_RATIOS: Array<{ value: string; label: string; desc: string; w: number; h: number }> = [
  { value: '16:9', label: '16:9', desc: 'Widescreen', w: 40, h: 22 },
  { value: '9:16', label: '9:16', desc: 'Portrait', w: 22, h: 40 },
  { value: '1:1',  label: '1:1',  desc: 'Square',    w: 30, h: 30 },
];

const FALLBACK_RESOLUTIONS = [
  { value: '480p',  display: '480p',  order: 1, isAllowed: true  },
  { value: '720p',  display: '720p',  order: 2, isAllowed: true  },
  { value: '1080p', display: '1080p', order: 3, isAllowed: false },
  { value: '1440p', display: '1440p', order: 4, isAllowed: false },
  { value: '4K',    display: '4K',    order: 5, isAllowed: false },
];

const MAX_CHARS = 2000;

// ─── Component ───────────────────────────────────────────
export default function CreateScreen() {
  const router = useRouter();
  const {
    featured,
    featuredLoading,
    loadFeatured,
    pendingPrompt,
    clearPendingPrompt,
  } = useTemplateStore();

  // Form state
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('720p');

  // API data
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [resolutionConfig, setResolutionConfig] = useState<AspectRatioConfig[]>([]);

  // UI state
  const [initLoading, setInitLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [promptFocused, setPromptFocused] = useState(false);

  // Modal state
  const [modalTemplate, setModalTemplate] = useState<TemplateItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fetchingTemplateId, setFetchingTemplateId] = useState<number | null>(null);

  // Prompt input ref for focus
  const promptInputRef = useRef<TextInput>(null);

  // ── Consume pending prompt from Templates screen ──
  useFocusEffect(
    useCallback(() => {
      if (pendingPrompt) {
        setPrompt(pendingPrompt.slice(0, MAX_CHARS));
        clearPendingPrompt();
        setTimeout(() => promptInputRef.current?.focus(), 300);
      }
    }, [pendingPrompt])
  );

  // ── Initial data load ──
  useEffect(() => {
    const load = async () => {
      try {
        const [creditsData, configData] = await Promise.all([
          animationApi.getCredits().catch(() => null),
          animationApi.getResolutionConfig().catch(() => []),
        ]);
        if (creditsData) setCredits(creditsData);
        if (configData.length) {
          setResolutionConfig(configData);
          const cfg = configData.find((c) => c.aspectRatio === '16:9');
          const first = cfg?.resolutions.find((r) => r.isAllowed);
          if (first) setResolution(first.value);
        }
      } finally {
        setInitLoading(false);
      }
    };
    load();
    loadFeatured();
  }, []);

  // ── Aspect ratio change ──
  const handleAspectRatioChange = (value: string) => {
    setAspectRatio(value);
    const cfg = resolutionConfig.find((c) => c.aspectRatio === value);
    if (cfg) {
      const first = cfg.resolutions.find((r) => r.isAllowed);
      if (first) setResolution(first.value);
    }
  };

  const currentConfig = resolutionConfig.find((c) => c.aspectRatio === aspectRatio);
  const resolutions = currentConfig?.resolutions ?? FALLBACK_RESOLUTIONS;
  const fpsLabel = currentConfig?.fpsOptions[0]?.display ?? '30 FPS (Standard)';

  // ── Resolution tap ──
  const handleResolutionPress = (value: string, isAllowed: boolean) => {
    if (!isAllowed) {
      Alert.alert(
        'Pro Feature',
        `${value} requires a Pro subscription. Upgrade to unlock HD+, longer animations, and watermark-free exports.`,
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade ›', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }
    setResolution(value);
  };

  // ── Featured template card tap ──
  const handleTemplateTap = async (templateId: number) => {
    setFetchingTemplateId(templateId);
    try {
      const detail = await templateApi.getDetail(templateId);
      setModalTemplate(detail);
      setModalVisible(true);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load template' });
    } finally {
      setFetchingTemplateId(null);
    }
  };

  // ── Modal "Use This Template" ──
  const handleModalUse = useCallback(
    (templatePrompt: string, templateId: number) => {
      setPrompt(templatePrompt.slice(0, MAX_CHARS));
      setModalVisible(false);
      setTimeout(() => promptInputRef.current?.focus(), 350);
    },
    []
  );

  // ── Create submission ──
  const handleCreate = async () => {
    const trimmed = prompt.trim();
    if (trimmed.length < 5) {
      Toast.show({
        type: 'error',
        text1: 'Prompt too short',
        text2: 'Describe your animation (min 5 characters)',
      });
      return;
    }
    if (credits && !credits.hasAvailableCredits) {
      Alert.alert(
        'No Credits Remaining',
        'You have used all your credits. Upgrade to create more animations.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade ›', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }
    setCreating(true);
    try {
      await animationApi.generate({
        prompt: trimmed,
        animationType: 'Map',
        mapType: '',
        videoResolution: resolution,
        fps: 30,
        aspectRatio,
        isRetry: false,
        animationProjectId: 0,
      });
      Toast.show({
        type: 'success',
        text1: 'Animation queued!',
        text2: 'Track progress in the Projects tab',
      });
      setPrompt('');
      router.push('/(tabs)/projects');
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ?? 'Failed to queue animation. Please try again.';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setCreating(false);
    }
  };

  // ─── Credit badge color ───
  const creditsRemaining = credits?.isAdmin ? null : credits?.creditsRemaining;
  const creditsColor =
    credits === null
      ? Colors.textMuted
      : credits.isAdmin
      ? Colors.success
      : credits.creditsRemaining > 10
      ? Colors.success
      : credits.creditsRemaining > 3
      ? Colors.warning
      : Colors.error;

  const canCreate = prompt.trim().length >= 5 && !creating;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Create</Text>
          <Text style={styles.headerSub}>AI-powered map animation</Text>
        </View>
        <TouchableOpacity
          style={[styles.creditsBadge, { borderColor: creditsColor + '55' }]}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.75}
          accessibilityLabel="View credits"
        >
          {initLoading ? (
            <ActivityIndicator size="small" color={Colors.textMuted} />
          ) : (
            <>
              <Text style={styles.creditsIcon}>⚡</Text>
              <Text style={[styles.creditsNum, { color: creditsColor }]}>
                {credits?.isAdmin ? '∞' : (creditsRemaining ?? '—')}
              </Text>
              <Text style={styles.creditsLabel}> left</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Prompt ── */}
          <View style={[styles.card, promptFocused && styles.cardFocused]}>
            <SectionLabel>Describe Your Animation</SectionLabel>
            <TextInput
              ref={promptInputRef}
              style={styles.promptInput}
              placeholder={
                'e.g. Show a road trip from New York to Los Angeles along Route 66, ' +
                'highlighting the Grand Canyon and Las Vegas along the way...'
              }
              placeholderTextColor={Colors.textMuted}
              value={prompt}
              onChangeText={(t) => setPrompt(t.slice(0, MAX_CHARS))}
              multiline
              textAlignVertical="top"
              autoCorrect
              autoCapitalize="sentences"
              onFocus={() => setPromptFocused(true)}
              onBlur={() => setPromptFocused(false)}
            />
            <Text
              style={[
                styles.charCounter,
                prompt.length > MAX_CHARS * 0.9 && { color: Colors.warning },
                prompt.length >= MAX_CHARS && { color: Colors.error },
              ]}
            >
              {prompt.length} / {MAX_CHARS}
            </Text>
          </View>

          {/* ── Aspect Ratio ── */}
          <View style={styles.card}>
            <SectionLabel>Aspect Ratio</SectionLabel>
            <View style={styles.aspectRow}>
              {ASPECT_RATIOS.map((ar) => {
                const selected = aspectRatio === ar.value;
                return (
                  <TouchableOpacity
                    key={ar.value}
                    style={[styles.aspectCard, selected && styles.aspectCardSelected]}
                    onPress={() => handleAspectRatioChange(ar.value)}
                    activeOpacity={0.72}
                    accessibilityLabel={`${ar.label} ${ar.desc}`}
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={[
                        styles.ratioVisual,
                        { width: ar.w, height: ar.h },
                        selected && styles.ratioVisualSelected,
                      ]}
                    />
                    <Text style={[styles.aspectRatioLabel, selected && styles.textAccent]}>
                      {ar.label}
                    </Text>
                    <Text style={[styles.aspectRatioDesc, selected && styles.aspectDescSelected]}>
                      {ar.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Resolution ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <SectionLabel style={{ marginBottom: 0 }}>Resolution</SectionLabel>
              {credits?.isFreeUser && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                  <Text style={styles.upgradeLink}>Upgrade for HD+ ›</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.resolutionRow}
              style={{ marginTop: 12 }}
            >
              {resolutions.map((res) => {
                const selected = resolution === res.value;
                const locked = !res.isAllowed;
                return (
                  <TouchableOpacity
                    key={res.value}
                    style={[
                      styles.resChip,
                      selected && styles.resChipSelected,
                      locked && styles.resChipLocked,
                    ]}
                    onPress={() => handleResolutionPress(res.value, res.isAllowed)}
                    activeOpacity={0.75}
                  >
                    {locked && <Text style={styles.lockEmoji}>🔒</Text>}
                    <Text
                      style={[
                        styles.resChipLabel,
                        selected && styles.resChipLabelSelected,
                        locked && styles.resChipLabelLocked,
                      ]}
                    >
                      {res.value}
                    </Text>
                    {locked && (
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* FPS info */}
            <View style={styles.fpsRow}>
              <View style={[styles.fpsDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.fpsLabel}>{fpsLabel}</Text>
            </View>
          </View>

          {/* ── Featured Templates Carousel ── */}
          {(featuredLoading || featured.length > 0) && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <SectionLabel style={{ marginBottom: 0 }}>Quick Start</SectionLabel>
                <Text style={styles.carouselHint}>Tap to preview</Text>
              </View>

              {featuredLoading ? (
                <View style={styles.carouselLoading}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                </View>
              ) : (
                <FlatList
                  horizontal
                  data={featured}
                  keyExtractor={(item) => String(item.id)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselList}
                  style={{ marginTop: 12 }}
                  renderItem={({ item }) => {
                    const loading = fetchingTemplateId === item.id;
                    return (
                      <TouchableOpacity
                        style={styles.templateCard}
                        onPress={() => handleTemplateTap(item.id)}
                        activeOpacity={0.8}
                      >
                        {item.thumbnailUrl ? (
                          <Image
                            source={{ uri: item.thumbnailUrl }}
                            style={styles.templateThumb}
                            contentFit="cover"
                            transition={250}
                          />
                        ) : (
                          <View style={[styles.templateThumb, styles.templateThumbEmpty]}>
                            <Text style={{ fontSize: 28 }}>🗺️</Text>
                          </View>
                        )}
                        {/* Loading overlay */}
                        {loading && (
                          <View style={styles.templateLoadingOverlay}>
                            <ActivityIndicator color={Colors.white} />
                          </View>
                        )}
                        {/* Bottom overlay */}
                        <View style={styles.templateBottomOverlay}>
                          <View style={styles.templateBottomInner}>
                            <Text style={styles.templateCardTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={styles.templateCardStats}>▶ {item.usedCounter}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ── Create Button ── */}
        <View style={styles.createBtnWrapper}>
          <TouchableOpacity
            style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canCreate}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create animation"
          >
            {creating ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.createBtnIcon}>⚡</Text>
                <Text style={styles.createBtnLabel}>Create Animation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Template Detail Modal ── */}
      <TemplateDetailModal
        visible={modalVisible}
        template={modalTemplate}
        onClose={() => setModalVisible(false)}
        onUse={handleModalUse}
      />
    </SafeAreaView>
  );
}

// ── Section label helper ──────────────────────────────────
function SectionLabel({ children, style }: { children: string; style?: object }) {
  return (
    <Text style={[sectionLabelStyle, style]}>{children}</Text>
  );
}
const sectionLabelStyle: object = {
  color: '#5A7FAF',
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 1.3,
  textTransform: 'uppercase',
  marginBottom: 12,
};

// ─── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    minWidth: 86,
    minHeight: 34,
    justifyContent: 'center',
  },
  creditsIcon: { fontSize: 12, marginRight: 3 },
  creditsNum: { fontSize: 14, fontWeight: '700' },
  creditsLabel: { fontSize: 12, color: Colors.textSecondary },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Card ──
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 16,
    marginBottom: 10,
  },
  cardFocused: {
    borderColor: 'rgba(68,153,255,0.32)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Prompt ──
  promptInput: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 23,
    minHeight: 110,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  charCounter: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 7,
    letterSpacing: 0.2,
  },

  // ── Aspect Ratio ──
  aspectRow: {
    flexDirection: 'row',
    gap: 10,
  },
  aspectCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: Colors.surfaceElevated,
    gap: 7,
  },
  aspectCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  ratioVisual: {
    borderRadius: 3,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  ratioVisualSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  aspectRatioLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  aspectRatioDesc: {
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.1,
  },
  textAccent: { color: Colors.primary },
  aspectDescSelected: { color: Colors.primaryBright + 'AA' },

  // ── Resolution ──
  upgradeLink: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  resolutionRow: { gap: 8, paddingRight: 4 },
  resChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: Colors.surfaceElevated,
    gap: 4,
  },
  resChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 4,
  },
  resChipLocked: { opacity: 0.50 },
  lockEmoji: { fontSize: 10 },
  resChipLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  resChipLabelSelected: { color: Colors.white },
  resChipLabelLocked: { color: Colors.textMuted },
  proBadge: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 2,
  },
  proBadgeText: {
    color: Colors.warning,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // ── FPS ──
  fpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  fpsDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  fpsLabel: { color: Colors.textSecondary, fontSize: 12, letterSpacing: 0.2 },

  // ── Carousel ──
  carouselHint: { color: Colors.textMuted, fontSize: 11 },
  carouselLoading: { height: 96, alignItems: 'center', justifyContent: 'center' },
  carouselList: { gap: 10, paddingRight: 4 },
  templateCard: {
    width: 148,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  templateThumb: { width: '100%', height: '100%' },
  templateThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  templateLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBottomOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  templateBottomInner: {
    backgroundColor: 'rgba(4,7,16,0.70)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  templateCardTitle: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  templateCardStats: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 10,
    marginTop: 2,
  },

  // ── Create Button ──
  createBtnWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: BG,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 54,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  createBtnDisabled: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  createBtnIcon: { fontSize: 18 },
  createBtnLabel: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
