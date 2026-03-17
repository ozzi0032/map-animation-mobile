import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, BG } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';

export default function ProfileScreen() {
  const { logout, user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + info */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.fullName ?? 'User'}</Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user?.roles?.includes('Admin') ? '✦ Admin' : '● Free Plan'}
            </Text>
          </View>
        </View>

        {/* Settings sections */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <MenuItem icon="✏️" label="Edit Profile" onPress={() => {}} comingSoon />
          <MenuItem icon="🔑" label="Change Password" onPress={() => {}} comingSoon />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Subscription</Text>
          <MenuItem icon="⚡" label="Manage Subscription" onPress={() => {}} comingSoon />
          <MenuItem icon="📜" label="Billing History" onPress={() => {}} comingSoon />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>General</Text>
          <MenuItem icon="🔔" label="Notifications" onPress={() => {}} comingSoon />
          <MenuItem icon="❓" label="Help & Support" onPress={() => {}} comingSoon />
          <MenuItem icon="📄" label="Privacy Policy" onPress={() => {}} comingSoon />
          <MenuItem icon="📋" label="Terms of Service" onPress={() => {}} comingSoon last />
        </View>

        {/* Log out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  comingSoon,
  last,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  comingSoon?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {comingSoon && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        )}
        <Text style={styles.menuChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG, paddingTop: 0 },
  header: {
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

  content: { paddingHorizontal: 16, paddingTop: 24 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryDim,
    borderWidth: 2,
    borderColor: Colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarInitials: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  userName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  roleBadgeText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },

  // Section
  section: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  menuIcon: { fontSize: 16, marginRight: 12, width: 22, textAlign: 'center' },
  menuLabel: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comingSoonBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  comingSoonText: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  menuChevron: { color: Colors.textMuted, fontSize: 18 },

  // Logout
  logoutBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  logoutBtnText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
