import React from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@store/appStore';
import { GlassCard } from '@components/glass/GlassCard';
import { GlassButton } from '@components/glass/GlassButton';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore(s => s.completeOnboarding);

  const handleGetStarted = () => {
    completeOnboarding();
    // Redirects to login
  };

  const handleSignIn = () => {
    completeOnboarding();
    // Redirects to login
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Decorative Warm Ambient Circle */}
      <View style={styles.ambientCircle} />

      <View style={styles.contentContainer}>
        {/* Logo and Tagline */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="blur" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Smart <Text style={styles.accentText}>CodeFlurry</Text></Text>
          <Text style={styles.subtitle}>Universal IoT Control & Automation</Text>
        </View>

        {/* Info Card */}
        <GlassCard style={styles.infoCard} intensity="strong">
          <Text style={styles.welcomeText}>Welcome to Smart CodeFlurry</Text>
          <Text style={styles.descriptionText}>
            Your intelligent IoT platform to monitor, control and automate your world.
          </Text>

          <GlassButton
            label="GET STARTED"
            onPress={handleGetStarted}
            variant="primary"
            fullWidth
            style={styles.ctaButton}
          />

          <View style={styles.footerLinkContainer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text style={styles.signInLink} onPress={handleSignIn}>
              Sign in
            </Text>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    padding: Spacing.xl,
  },
  ambientCircle: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.primaryGlow,
    opacity: 0.6,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-around',
    paddingVertical: Spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.wide,
  },
  accentText: {
    color: Colors.primary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    letterSpacing: Typography.letterSpacing.wider,
  },
  infoCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed,
    marginBottom: Spacing.xl,
  },
  ctaButton: {
    marginBottom: Spacing.md,
  },
  footerLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  signInLink: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
});
