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
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useProjectStore } from '../../store/projectStore';
import { projectApi } from '../../api/projectApi';
import type { ProjectDetail } from '../../api/projectApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX = SCREEN_HEIGHT * 0.88;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStatusConfig(project: ProjectDetail): {
  label: string;
  color: string;
  pulse: boolean;
  bgColor: string;
} {
  if (project.isCompleted) {
    return { label: 'Completed', color: Colors.success, pulse: false, bgColor: 'rgba(16,185,129,0.14)' };
  }
  if (project.isFailed) {
    return { label: 'Failed', color: Colors.error, pulse: false, bgColor: 'rgba(239,68,68,0.14)' };
  }
  if (project.isProcessing || project.jobStatus === 'Rendering') {
    return { label: 'Processing', color: Colors.primary, pulse: true, bgColor: 'rgba(68,153,255,0.14)' };
  }
  return { label: 'Pending', color: Colors.warning, pulse: true, bgColor: 'rgba(245,158,11,0.14)' };
}

function deriveResolution(w: number | null, h: number | null): string {
  if (!h) return '—';
  if (h >= 2160) return '4K';
  if (h >= 1440) return '1440p';
  if (h >= 1080) return '1080p';
  if (h >= 720) return '720p';
  return '480p';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity: anim }]} />;
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaChipLabel}>{label}</Text>
      <Text style={styles.metaChipValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  bgColor,
  borderColor,
  onPress,
  disabled = false,
}: {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: bgColor, borderColor }, disabled && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.72}
      accessibilityLabel={label}
    >
      <Text style={styles.actionBtnIcon}>{icon}</Text>
      <Text style={[styles.actionBtnLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ProjectDetailModal({ visible, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_MAX)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const {
    selectedProject,
    detailLoading,
    detailError,
    toggleFavorite,
    renameProject,
    deleteProject,
    closeDetail,
  } = useProjectStore();

  // Video player
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Rename
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Prompt expand
  const [promptExpanded, setPromptExpanded] = useState(false);

  // Convert to template
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);

  // Download
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Reset local state when project changes
  useEffect(() => {
    setVideoVisible(false);
    setVideoError(null);
    setVideoLoading(false);
    setIsRenaming(false);
    setRenameValue(selectedProject?.title ?? '');
    setPromptExpanded(false);
    setShowTemplateForm(false);
    setTemplateTitle(selectedProject?.title ?? '');
    setTemplateDesc('');
    setDownloadLoading(false);
  }, [selectedProject?.id]);

  // Slide animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 12,
        }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SHEET_MAX, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    closeDetail();
    onClose();
  }, [onClose, closeDetail]);

  const handleFavorite = useCallback(async () => {
    if (!selectedProject) return;
    await toggleFavorite(selectedProject.id);
  }, [selectedProject, toggleFavorite]);

  const handleRenameSubmit = useCallback(async () => {
    if (!selectedProject || !renameValue.trim()) return;
    setRenameLoading(true);
    try {
      await renameProject(selectedProject.id, renameValue.trim());
      setIsRenaming(false);
    } catch {
      Alert.alert('Error', 'Failed to rename project. Please try again.');
    } finally {
      setRenameLoading(false);
    }
  }, [selectedProject, renameValue, renameProject]);

  const handleDownload = useCallback(async () => {
    if (!selectedProject?.videoUrl) return;
    setDownloadLoading(true);
    try {
      // Track analytics (fire-and-forget)
      projectApi.trackDownload(selectedProject.id).catch(() => {});
      await Linking.openURL(selectedProject.videoUrl);
    } catch {
      Alert.alert('Download', 'Could not open download link. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  }, [selectedProject]);

  const handleConvertToTemplate = useCallback(async () => {
    if (!selectedProject) return;
    if (!templateTitle.trim()) {
      Alert.alert('Required', 'Please enter a title for the template.');
      return;
    }
    setTemplateLoading(true);
    try {
      await projectApi.createTemplate(
        selectedProject.id,
        templateTitle.trim(),
        templateDesc.trim() || undefined
      );
      setShowTemplateForm(false);
      Alert.alert('Done', 'Template created successfully!');
    } catch {
      Alert.alert('Error', 'Failed to create template. Please try again.');
    } finally {
      setTemplateLoading(false);
    }
  }, [selectedProject, templateTitle, templateDesc]);

  const handleDelete = useCallback(() => {
    if (!selectedProject) return;
    Alert.alert(
      'Delete Project',
      `Delete "${selectedProject.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject(selectedProject.id);
              handleClose();
            } catch {
              Alert.alert('Error', 'Failed to delete project. Please try again.');
            }
          },
        },
      ]
    );
  }, [selectedProject, deleteProject, handleClose]);

  const statusConfig = selectedProject ? getStatusConfig(selectedProject) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag handle */}
          <View style={styles.dragHandleRow}>
            <View style={styles.dragHandle} />
          </View>

          {/* Loading */}
          {detailLoading && (
            <View style={styles.centeredBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.centeredBoxText}>Loading project…</Text>
            </View>
          )}

          {/* Error */}
          {detailError && !detailLoading && (
            <View style={styles.centeredBox}>
              <Text style={styles.centeredBoxIcon}>⚠️</Text>
              <Text style={styles.centeredBoxText}>{detailError}</Text>
            </View>
          )}

          {/* Content */}
          {selectedProject && !detailLoading && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Thumbnail ── */}
              <View style={styles.thumbContainer}>
                {selectedProject.thumbnailUrl ? (
                  <Image
                    source={{ uri: selectedProject.thumbnailUrl }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    {statusConfig?.pulse ? (
                      <View style={styles.processingBox}>
                        <PulseDot color={statusConfig.color} />
                        <Text style={[styles.processingLabel, { color: statusConfig.color }]}>
                          {statusConfig.label}…
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.thumbPlaceholderIcon}>🎬</Text>
                    )}
                  </View>
                )}

                {/* Aspect ratio badge */}
                <View style={styles.aspectBadge}>
                  <Text style={styles.aspectBadgeText}>{selectedProject.aspectRatio}</Text>
                </View>

                {/* Play button (completed + has video) */}
                {selectedProject.videoUrl && selectedProject.isCompleted && (
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => {
                      setVideoError(null);
                      setVideoVisible(true);
                      setVideoLoading(true);
                    }}
                    activeOpacity={0.8}
                    accessibilityLabel="Play video"
                  >
                    <View style={styles.playBtnInner}>
                      <Text style={styles.playBtnIcon}>▶</Text>
                    </View>
                    <Text style={styles.playBtnLabel}>Play Video</Text>
                  </TouchableOpacity>
                )}

                {/* Video error inline */}
                {videoError && (
                  <View style={styles.videoErrorBanner}>
                    <Text style={styles.videoErrorText}>⚠ {videoError}</Text>
                  </View>
                )}
              </View>

              {/* ── Title / Rename ── */}
              <View style={styles.titleRow}>
                {isRenaming ? (
                  <View style={styles.renameRow}>
                    <TextInput
                      style={styles.renameInput}
                      value={renameValue}
                      onChangeText={setRenameValue}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleRenameSubmit}
                      maxLength={200}
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TouchableOpacity
                      style={styles.renameSaveBtn}
                      onPress={handleRenameSubmit}
                      disabled={renameLoading}
                    >
                      {renameLoading ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.renameSaveBtnText}>Save</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.renameCancelBtn}
                      onPress={() => {
                        setIsRenaming(false);
                        setRenameValue(selectedProject.title);
                      }}
                    >
                      <Text style={styles.renameCancelBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.title} numberOfLines={2}>
                    {selectedProject.title}
                  </Text>
                )}
              </View>

              {/* ── Status badge ── */}
              {statusConfig && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusConfig.bgColor,
                      borderColor: `${statusConfig.color}44`,
                    },
                  ]}
                >
                  {statusConfig.pulse ? (
                    <PulseDot color={statusConfig.color} />
                  ) : (
                    <View style={[styles.dot, { backgroundColor: statusConfig.color }]} />
                  )}
                  <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              )}

              {/* ── Metadata row ── */}
              <View style={styles.metaRow}>
                <MetaChip label="ASPECT" value={selectedProject.aspectRatio} />
                <MetaChip
                  label="RESOLUTION"
                  value={deriveResolution(selectedProject.videoWidth, selectedProject.videoHeight)}
                />
                <MetaChip label="FPS" value="30" />
                <MetaChip label="MODIFIED" value={selectedProject.modifiedTimeAgo} />
              </View>

              {/* ── Prompt ── */}
              <View style={styles.promptBox}>
                <View style={styles.promptHeader}>
                  <Text style={styles.promptLabel}>PROMPT</Text>
                  <TouchableOpacity onPress={() => setPromptExpanded(!promptExpanded)}>
                    <Text style={styles.promptToggle}>
                      {promptExpanded ? 'Show less' : 'Show more'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text
                  style={styles.promptText}
                  numberOfLines={promptExpanded ? undefined : 3}
                >
                  {selectedProject.userPrompt}
                </Text>
              </View>

              {/* ── Actions grid ── */}
              <View style={styles.actionsGrid}>
                <ActionButton
                  icon={selectedProject.isFavorite ? '⭐' : '☆'}
                  label={selectedProject.isFavorite ? 'Unfavorite' : 'Favorite'}
                  color={selectedProject.isFavorite ? Colors.warning : Colors.textSecondary}
                  bgColor={
                    selectedProject.isFavorite ? 'rgba(245,158,11,0.12)' : Colors.surfaceElevated
                  }
                  borderColor={
                    selectedProject.isFavorite
                      ? 'rgba(245,158,11,0.30)'
                      : 'rgba(255,255,255,0.08)'
                  }
                  onPress={handleFavorite}
                />

                <ActionButton
                  icon="✏️"
                  label="Rename"
                  color={Colors.textSecondary}
                  bgColor={Colors.surfaceElevated}
                  borderColor="rgba(255,255,255,0.08)"
                  onPress={() => {
                    setIsRenaming(true);
                    setRenameValue(selectedProject.title);
                  }}
                />

                {selectedProject.canDownload && (
                  <ActionButton
                    icon={downloadLoading ? '⏳' : '⬇️'}
                    label="Download"
                    color={Colors.primary}
                    bgColor={Colors.primaryDim}
                    borderColor={Colors.borderAccent}
                    onPress={handleDownload}
                    disabled={downloadLoading}
                  />
                )}

                {selectedProject.canCreateTemplate && (
                  <ActionButton
                    icon="🔄"
                    label="Template"
                    color={Colors.accentPurple}
                    bgColor={Colors.accentGlow}
                    borderColor="rgba(139,92,246,0.28)"
                    onPress={() => setShowTemplateForm(!showTemplateForm)}
                  />
                )}
              </View>

              {/* ── Convert to template inline form ── */}
              {showTemplateForm && (
                <View style={styles.templateForm}>
                  <Text style={styles.templateFormTitle}>Save as Template</Text>
                  <TextInput
                    style={styles.templateInput}
                    value={templateTitle}
                    onChangeText={setTemplateTitle}
                    placeholder="Template title"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={200}
                  />
                  <TextInput
                    style={[styles.templateInput, styles.templateInputMultiline]}
                    value={templateDesc}
                    onChangeText={setTemplateDesc}
                    placeholder="Description (optional)"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                    maxLength={1000}
                  />
                  <View style={styles.templateFormActions}>
                    <TouchableOpacity
                      style={styles.templateCancelBtn}
                      onPress={() => setShowTemplateForm(false)}
                    >
                      <Text style={styles.templateCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.templateSaveBtn,
                        templateLoading && styles.templateSaveBtnDisabled,
                      ]}
                      onPress={handleConvertToTemplate}
                      disabled={templateLoading}
                    >
                      {templateLoading ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.templateSaveText}>Create Template</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── Delete ── */}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.72}
                accessibilityLabel="Delete project"
              >
                <Text style={styles.deleteBtnText}>🗑  Delete Project</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* ── In-app video player modal ── */}
      <Modal
        visible={videoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVideoVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.videoRoot}>
          <TouchableOpacity
            style={styles.videoBackdrop}
            onPress={() => setVideoVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.videoContainer}>
            {videoLoading && (
              <ActivityIndicator
                style={StyleSheet.absoluteFill}
                color={Colors.primary}
                size="large"
              />
            )}
            {selectedProject?.videoUrl ? (
              <Video
                source={{ uri: selectedProject.videoUrl }}
                style={styles.videoPlayer}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                onReadyForDisplay={() => setVideoLoading(false)}
                onError={() => {
                  setVideoLoading(false);
                  setVideoVisible(false);
                  setVideoError('Could not load video. Please try again.');
                }}
              />
            ) : null}
            <TouchableOpacity
              style={styles.videoCloseBtn}
              onPress={() => setVideoVisible(false)}
            >
              <Text style={styles.videoCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
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
  centeredBox: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  centeredBoxIcon: { fontSize: 40 },
  centeredBoxText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 24,
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
    backgroundColor: Colors.surfaceElevated,
  },
  thumb: {
    width: '100%',
    height: 200,
  },
  thumbPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderIcon: { fontSize: 48 },
  processingBox: {
    alignItems: 'center',
    gap: 10,
  },
  processingLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  aspectBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(7,9,19,0.78)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  aspectBadgeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  playBtn: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  playBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(68,153,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.65,
    shadowRadius: 8,
    elevation: 5,
  },
  playBtnIcon: { color: Colors.white, fontSize: 14, marginLeft: 2 },
  playBtnLabel: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoErrorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(239,68,68,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  videoErrorText: { color: Colors.white, fontSize: 12, fontWeight: '600' },

  // ── Title / Rename ──
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renameInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  renameSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 54,
    alignItems: 'center',
  },
  renameSaveBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  renameCancelBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  renameCancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Status ──
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Metadata ──
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  metaChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  metaChipLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  metaChipValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Prompt ──
  promptBox: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promptLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  promptToggle: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  promptText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  // ── Actions ──
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  actionBtn: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnIcon: { fontSize: 22 },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Template form ──
  templateForm: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.28)',
    gap: 10,
  },
  templateFormTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  templateInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  templateInputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  templateFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  templateCancelBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  templateCancelText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  templateSaveBtn: {
    flex: 2,
    backgroundColor: Colors.accentPurple,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  templateSaveBtnDisabled: { opacity: 0.5 },
  templateSaveText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Delete ──
  deleteBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCloseBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
});
