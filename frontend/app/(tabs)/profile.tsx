import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserRole } from '../../contexts/UserRoleContext';
import { UserRole } from '../../data/user';

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { isDark, colors, toggleTheme } = useTheme();
  const { userRole, setRole, refreshRole } = useUserRole();

  // Refresh user role when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshRole();
    }, [refreshRole])
  );

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === userRole) return;

    Alert.alert(
      'Change Role',
      `Are you sure you want to change your role to ${newRole === 'coach' ? 'Coach' : 'Athlete'}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            await setRole(newRole);
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container(colors)}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, isTablet && styles.profileHeaderTablet]}>
        <View style={[styles.avatarContainer(colors), isTablet && styles.avatarContainerTablet]}>
          <Ionicons name="person" size={isTablet ? 80 : 64} color={colors.primary} />
        </View>
        <Text style={[styles.profileName(colors), isTablet && styles.profileNameTablet]}>
          Profile
        </Text>
        <Text style={[styles.profileSubtitle(colors), isTablet && styles.profileSubtitleTablet]}>
          Manage your account settings
        </Text>
      </View>

      {/* Dark Mode Toggle */}
      <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
        <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
          Appearance
        </Text>
        <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
          Choose your preferred color theme
        </Text>
        <TouchableOpacity
          style={[styles.themeToggle(colors), isTablet && styles.themeToggleTablet]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={isTablet ? 28 : 24}
            color={colors.primary}
          />
          <Text style={styles.themeToggleText(colors)}>
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={isTablet ? 24 : 20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* User Role Section */}
      <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
        <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
          Account Type
        </Text>
        <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
          Select your role to customize your experience
        </Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleButton(colors),
              userRole === 'coach' && styles.roleButtonActive(colors),
              isTablet && styles.roleButtonTablet,
            ]}
            onPress={() => handleRoleChange('coach')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="people" 
              size={isTablet ? 32 : 28} 
              color={userRole === 'coach' ? colors.white : colors.primary} 
            />
            <Text
              style={[
                styles.roleButtonText(colors),
                userRole === 'coach' && styles.roleButtonTextActive,
                isTablet && styles.roleButtonTextTablet,
              ]}
            >
              Coach
            </Text>
            {userRole === 'coach' && (
              <Ionicons name="checkmark-circle" size={isTablet ? 24 : 20} color={colors.white} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton(colors),
              userRole === 'athlete' && styles.roleButtonActive(colors),
              isTablet && styles.roleButtonTablet,
            ]}
            onPress={() => handleRoleChange('athlete')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="person" 
              size={isTablet ? 32 : 28} 
              color={userRole === 'athlete' ? colors.white : colors.primary} 
            />
            <Text
              style={[
                styles.roleButtonText(colors),
                userRole === 'athlete' && styles.roleButtonTextActive,
                isTablet && styles.roleButtonTextTablet,
              ]}
            >
              Athlete
            </Text>
            {userRole === 'athlete' && (
              <Ionicons name="checkmark-circle" size={isTablet ? 24 : 20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Section */}
      <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
        <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
          About
        </Text>
        <View style={styles.infoItem}>
          <Ionicons name="information-circle-outline" size={isTablet ? 24 : 20} color={colors.textLight} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel(colors), isTablet && styles.infoLabelTablet]}>
              Current Role
            </Text>
            <Text style={[styles.infoValue(colors), isTablet && styles.infoValueTablet]}>
              {userRole === 'coach' ? 'Coach' : 'Athlete'}
            </Text>
          </View>
        </View>
      </View>

      {/* Everyone Section */}
      <View style={[styles.section(colors), isTablet && styles.sectionTablet]}>
        <Text style={[styles.sectionTitle(colors), isTablet && styles.sectionTitleTablet]}>
          Team
        </Text>
        <Text style={[styles.sectionDescription(colors), isTablet && styles.sectionDescriptionTablet]}>
          View all coaches and athletes
        </Text>
        <TouchableOpacity
          style={[styles.everyoneButton(colors), isTablet && styles.everyoneButtonTablet]}
          onPress={() => router.push('/(tabs)/everyone')}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={isTablet ? 28 : 24} color={colors.primary} />
          <Text style={[styles.everyoneButtonText(colors), isTablet && styles.everyoneButtonTextTablet]}>
            Everyone
          </Text>
          <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

type ThemeColors = import('../../constants/themes').ThemeColors;

const styles = {
  container: (colors: ThemeColors) => ({
    flex: 1,
    backgroundColor: colors.neutralBackground,
  }),
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: (colors: ThemeColors) => ({
    fontSize: 16,
    color: colors.textLight,
  }),
  profileHeader: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    marginBottom: 24,
  },
  profileHeaderTablet: {
    paddingVertical: 40,
    marginBottom: 32,
  },
  avatarContainer: (colors: ThemeColors) => ({
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutralLight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 3,
    borderColor: colors.primary,
  }),
  avatarContainerTablet: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  profileName: (colors: ThemeColors) => ({
    fontSize: 28,
    color: colors.primary,
    marginBottom: 8,
    fontWeight: 'bold' as const,
  }),
  profileNameTablet: {
    fontSize: 36,
  },
  profileSubtitle: (colors: ThemeColors) => ({
    fontSize: 16,
    color: colors.textLight,
  }),
  profileSubtitleTablet: {
    fontSize: 18,
  },
  section: (colors: ThemeColors) => ({
    backgroundColor: colors.neutralLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  }),
  sectionTablet: {
    padding: 28,
    borderRadius: 20,
    marginBottom: 20,
  },
  sectionTitle: (colors: ThemeColors) => ({
    fontSize: 20,
    color: colors.primary,
    marginBottom: 8,
    fontWeight: 'bold' as const,
  }),
  sectionTitleTablet: {
    fontSize: 24,
    marginBottom: 12,
  },
  sectionDescription: (colors: ThemeColors) => ({
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 20,
  }),
  sectionDescriptionTablet: {
    fontSize: 16,
    marginBottom: 24,
  },
  themeToggle: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
  }),
  themeToggleTablet: {
    padding: 20,
    borderRadius: 16,
  },
  themeToggleText: (colors: ThemeColors) => ({
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  }),
  roleContainer: {
    gap: 12,
  },
  roleButton: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
  }),
  roleButtonTablet: {
    padding: 20,
    borderRadius: 16,
  },
  roleButtonActive: (colors: ThemeColors) => ({
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  }),
  roleButtonText: (colors: ThemeColors) => ({
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  }),
  roleButtonTextTablet: {
    fontSize: 18,
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  infoItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: (colors: ThemeColors) => ({
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  }),
  infoLabelTablet: {
    fontSize: 16,
  },
  infoValue: (colors: ThemeColors) => ({
    fontSize: 16,
    color: colors.text,
    fontWeight: '600' as const,
  }),
  infoValueTablet: {
    fontSize: 18,
  },
  everyoneButton: (colors: ThemeColors) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
  }),
  everyoneButtonTablet: {
    padding: 20,
    borderRadius: 16,
  },
  everyoneButtonText: (colors: ThemeColors) => ({
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  }),
  everyoneButtonTextTablet: {
    fontSize: 18,
  },
};
