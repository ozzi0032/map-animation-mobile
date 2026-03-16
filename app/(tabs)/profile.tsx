import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';

export default function ProfileScreen() {
  const { logout, user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>👤</Text>
      <Text style={styles.name}>
        {user?.fullName ?? 'Profile'}
      </Text>
      {user && <Text style={styles.email}>{user.email}</Text>}
      <Text style={styles.coming}>Profile settings — Coming in Iteration 4</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  name: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
  },
  coming: {
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 48,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
