import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Colors } from '../../src/constants/colors';
import { InputField } from '../../src/components/common/InputField';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { useAuthStore } from '../../src/store/authStore';

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ForgotPasswordScreen() {
  const { forgotPassword, isLoading } = useAuthStore();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email.trim())) {
      setEmailError('Please enter a valid email');
      return;
    }
    setEmailError('');

    try {
      const message = await forgotPassword(email.trim().toLowerCase());
      setIsSuccess(true);
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: message || 'Check your inbox for the reset link.',
        visibilityTime: 5000,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Could not send reset email. Try again.',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.icon}>🔑</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        {!isSuccess ? (
          <>
            <InputField
              label="Email Address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              error={emailError}
              textContentType="emailAddress"
            />

            <PrimaryButton
              title="Send Reset Link"
              onPress={handleSubmit}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />
          </>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to{' '}
              <Text style={styles.emailHighlight}>{email}</Text>. Check your inbox and
              follow the instructions.
            </Text>
            <PrimaryButton
              title="Back to Login"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: 24 }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 32,
  },
  backText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  header: {
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
