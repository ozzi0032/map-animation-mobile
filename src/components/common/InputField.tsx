import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  rightIcon?: React.ReactNode;
  containerStyle?: object;
}

export const InputField: React.FC<Props> = ({
  label,
  error,
  rightIcon,
  containerStyle,
  secureTextEntry,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry !== undefined;
  const actualSecure = isPassword ? !showPassword : false;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focused,
          !!error && styles.errorBorder,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword ? actualSecure : false}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel={label}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && (
          <View style={styles.rightIconContainer}>{rightIcon}</View>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  focused: {
    borderColor: Colors.primary,
  },
  errorBorder: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    height: 50,
    color: Colors.text,
    fontSize: 15,
  },
  eyeButton: {
    padding: 8,
  },
  eyeText: {
    fontSize: 16,
  },
  rightIconContainer: {
    padding: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
