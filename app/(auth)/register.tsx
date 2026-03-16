import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Colors } from '../../src/constants/colors';
import { InputField } from '../../src/components/common/InputField';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { useAuthStore } from '../../src/store/authStore';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getPasswordStrength = (
  password: string
): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: Colors.error };
  if (score <= 2) return { score, label: 'Fair', color: Colors.warning };
  if (score <= 3) return { score, label: 'Good', color: Colors.secondary };
  return { score, label: 'Strong', color: Colors.success };
};

/** Extract a human-readable message from an API error or thrown Error. */
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Registration failed. Please try again.';
};

export default function RegisterScreen() {
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const passwordStrength = getPasswordStrength(password);

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      const result = await register({
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      if (result.kind === 'autologin') {
        // Server auto-logged in — go straight to the app
        Toast.show({
          type: 'success',
          text1: 'Welcome!',
          text2: 'Your account has been created.',
          visibilityTime: 3000,
        });
        router.replace('/(tabs)');
      } else {
        // Email confirmation needed
        Toast.show({
          type: 'success',
          text1: 'Check Your Email',
          text2: `A confirmation link has been sent to ${result.email}.`,
          visibilityTime: 5000,
        });
        router.replace('/(auth)/login');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: extractErrorMessage(error),
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
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start creating AI-powered map animations</Text>
        </View>

        <InputField
          label="First Name (optional)"
          value={firstName}
          onChangeText={(t) => { setFirstName(t); clearError('firstName'); }}
          placeholder="John"
          autoCapitalize="words"
          error={errors.firstName}
          textContentType="givenName"
        />

        <InputField
          label="Last Name (optional)"
          value={lastName}
          onChangeText={(t) => { setLastName(t); clearError('lastName'); }}
          placeholder="Doe"
          autoCapitalize="words"
          error={errors.lastName}
          textContentType="familyName"
        />

        <InputField
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); clearError('email'); }}
          placeholder="you@example.com"
          keyboardType="email-address"
          error={errors.email}
          textContentType="emailAddress"
        />

        <InputField
          label="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); clearError('password'); }}
          placeholder="Min. 6 characters"
          secureTextEntry
          error={errors.password}
          textContentType="newPassword"
        />

        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor:
                        i <= passwordStrength.score
                          ? passwordStrength.color
                          : Colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
              {passwordStrength.label}
            </Text>
          </View>
        )}

        <InputField
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
          placeholder="Re-enter your password"
          secureTextEntry
          error={errors.confirmPassword}
          textContentType="newPassword"
        />

        <PrimaryButton
          title="Create Account"
          onPress={handleRegister}
          loading={isLoading}
          style={{ marginTop: 8 }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            accessibilityRole="link"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 16,
    gap: 10,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
