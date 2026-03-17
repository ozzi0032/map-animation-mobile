import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useTemplateStore } from '../../store/templateStore';
import type { TemplateItem } from '../../api/templateApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX = SCREEN_HEIGHT * 0.82;

interface Props {
  visible: boolean;
  template: TemplateItem | null;
  onClose: () => void;
  /** Called when the user taps "Use This Template" */
  onUse: (prompt: string, templateId: number) => void;
}

export function TemplateDetailModal({ visible, template, onClose, onUse }: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_MAX)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const [videoVisible, setVideoVisible] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const { toggleLike, recordView, getLikeState } = useTemplateStore();

  // Reset video state when template changes
  useEffect(() => {
    setVideoError(null);
    setVideoVisible(false);
    setVideoLoading(false);
  }, [template?.id]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 12,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      // Record view on open (fire-and-forget)
      if (template) recordView(template.id);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_MAX,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleUse = useCallback(() => {
    if (!template) return;
    onUse(template.userPrompt, template.id);
  }, [template, onUse]);

  const handleLike = useCallback(() => {
    if (!template) return;
    const { isLiked, likedCount } = getLikeState(
      template.id,
      template.isLikedByCurrentUser,
      template.likedCounter
    );
    toggleLike(template.id, isLiked, likedCount);
  }, [template, getLikeState, toggleLike]);

  if (!template) return null;

  const { isLiked, likedCount } = getLikeState(
    template.id,
    template.isLikedByCurrentUser,
    template.likedCounter
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* ── Backdrop ── */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        {/* ── Sheet ── */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Drag handle */}
          <View style={styles.dragHandleRow}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Thumbnail */}
            <View style={styles.thumbContainer}>
              {template.thumbnailUrl ? (
                <Image
                  source={{ uri: template.thumbnailUrl }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={styles.thumbPlaceholderIcon}>🗺️</Text>
                </View>
              )}
              {/* Aspect ratio badge */}
              <View style={styles.aspectBadge}>
                <Text style={styles.aspectBadgeText}>{template.aspectRatio}</Text>
              </View>
              {/* Play button overlay */}
              {template.videoUrl ? (
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => { setVideoError(null); setVideoVisible(true); setVideoLoading(true); }}
                  activeOpacity={0.8}
                  accessibilityLabel="Play video preview"
                >
                  <View style={styles.playBtnInner}>
                    <Text style={styles.playBtnIcon}>▶</Text>
                  </View>
                  <Text style={styles.playBtnLabel}>Play Preview</Text>
                </TouchableOpacity>
              ) : null}
              {/* Inline error banner (shown below thumb, not in video modal) */}
              {videoError ? (
                <View style={styles.videoErrorBanner}>
                  <Text style={styles.videoErrorText}>⚠ {videoError}</Text>
                </View>
              ) : null}
            </View>

            {/* Title + description */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{template.title}</Text>
              {template.description ? (
                <Text style={styles.description} numberOfLines={3}>
                  {template.description}
                </Text>
              ) : null}
            </View>

            {/* Prompt preview */}
            <View style={styles.promptBox}>
              <Text style={styles.promptLabel}>PROMPT</Text>
              <Text style={styles.promptText} numberOfLines={4}>
                {template.userPrompt}
              </Text>
            </View>

            {/* Stats row + like */}
            <View style={styles.statsRow}>
              <StatPill icon="👁" value={template.viewCounter} />
              <StatPill icon="▶" value={template.usedCounter} />

              {/* Like pill — interactive */}
              <TouchableOpacity
                style={[styles.statPill, isLiked && styles.statPillLiked]}
                onPress={handleLike}
                activeOpacity={0.7}
                accessibilityLabel={isLiked ? 'Unlike template' : 'Like template'}
              >
                <Text style={[styles.statPillIcon, isLiked && styles.statPillIconLiked]}>
                  {isLiked ? '❤️' : '🤍'}
                </Text>
                <Text style={[styles.statPillValue, isLiked && styles.statPillValueLiked]}>
                  {likedCount}
                </Text>
              </TouchableOpacity>

              {/* Spacer + system badge if applicable */}
              {template.isSystem && (
                <View style={styles.systemBadge}>
                  <Text style={styles.systemBadgeText}>✦ Official</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* ── CTA Button ── */}
          <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleUse}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Use this template"
            >
              <Text style={styles.ctaIcon}>⚡</Text>
              <Text style={styles.ctaText}>Use This Template</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* ── In-app video player ── */}
      <Modal
        visible={videoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVideoVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.videoRoot}>
          <TouchableOpacity style={styles.videoBackdrop} onPress={() => setVideoVisible(false)} activeOpacity={1} />
          <View style={styles.videoContainer}>
            {videoLoading && (
              <ActivityIndicator style={StyleSheet.absoluteFill} color={Colors.primary} size="large" />
            )}
            {template?.videoUrl ? (
              <Video
                source={{ uri: template.videoUrl }}
                style={styles.videoPlayer}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                onReadyForDisplay={() => setVideoLoading(false)}
                onError={(e) => {
                  setVideoLoading(false);
                  setVideoVisible(false);
                  setVideoError('Could not load video. Please try again.');
                }}
              />
            ) : null}
            <TouchableOpacity style={styles.videoCloseBtn} onPress={() => setVideoVisible(false)}>
              <Text style={styles.videoCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function StatPill({ icon, value }: { icon: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillIcon}>{icon}</Text>
      <Text style={styles.statPillValue}>{value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    maxHeight: SHEET_MAX,
    backgroundColor: '#0D1525',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    // Glow from the top
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  scrollContent: {
    paddingBottom: 8,
  },

  // ── Thumbnail ──
  thumbContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  thumb: {
    width: '100%',
    height: 190,
  },
  thumbPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderIcon: {
    fontSize: 48,
  },
  // ── Video player modal ──
  videoRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBackdrop: { ...StyleSheet.absoluteFillObject },
  videoContainer: {
    width: SCREEN_WIDTH - 24,
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  videoPlayer: { width: '100%', height: '100%' },
  videoCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCloseBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  videoErrorBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  videoErrorText: { color: Colors.error, fontSize: 13 },
  playBtn: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(68,153,255,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  playBtnIcon: { color: Colors.white, fontSize: 13, marginLeft: 2 },
  playBtnLabel: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  aspectBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(7,9,19,0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  aspectBadgeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Title ──
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  // ── Prompt preview ──
  promptBox: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  promptLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  promptText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statPillLiked: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.30)',
  },
  statPillIcon: {
    fontSize: 13,
  },
  statPillIconLiked: {
    fontSize: 13,
  },
  statPillValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  statPillValueLiked: {
    color: '#EF4444',
  },
  systemBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(68,153,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(68,153,255,0.28)',
  },
  systemBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },

  // ── CTA ──
  ctaContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16, // insets.bottom added inline via style prop
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 54,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaIcon: {
    fontSize: 18,
  },
  ctaText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
