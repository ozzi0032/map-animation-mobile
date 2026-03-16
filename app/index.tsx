import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';

export default function SplashScreen() {
  const { initialize, isAuthenticated, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isInitialized, isAuthenticated]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🗺️</Text>
      <Text style={styles.title}>MapAnimation</Text>
      <Text style={styles.subtitle}>AI-Powered Map Videos</Text>
      <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 48,
  },
  loader: {
    position: 'absolute',
    bottom: 80,
  },
});
