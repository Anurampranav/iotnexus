import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@store/appStore';
import { GlassCard } from '@components/glass/GlassCard';
import { GlassButton } from '@components/glass/GlassButton';
import { GlassInput } from '@components/glass/GlassInput';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const setAuthenticated = useAppStore(s => s.setAuthenticated);
  const setUserName = useAppStore(s => s.setUserName);

  const [username, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setError(null);
    setLoading(true);

    // Simulate login verification
    setTimeout(() => {
      setUserName(username.trim());
      setAuthenticated(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="lock-open-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to control your smart devices</Text>
        </View>

        <GlassCard style={styles.formCard} intensity="strong">
          {error && <Text style={styles.errorText}>{error}</Text>}

          <GlassInput
            label="Username"
            placeholder="Enter your name"
            icon="account-outline"
            value={username}
            onChangeText={setUsernameInput}
            style={styles.input}
          />

          <GlassInput
            label="Password"
            placeholder="••••••••"
            icon="key-outline"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <GlassButton
            label="SIGN IN"
            onPress={handleSignIn}
            loading={loading}
            fullWidth
            style={styles.button}
          />
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  formCard: {
    padding: Spacing.xl,
  },
  input: {
    marginBottom: Spacing.lg,
  },
  button: {
    marginTop: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
});
