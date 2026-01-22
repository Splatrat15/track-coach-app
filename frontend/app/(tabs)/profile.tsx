import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Colors, baseStyles } from '../../constants/styles';
import { getUserRole, initializeUserRole, setUserRole, UserRole } from '../../data/user';

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [userRole, setUserRoleState] = useState<UserRole>('coach');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user role on mount
  useEffect(() => {
    const init = async () => {
      await initializeUserRole();
      setUserRoleState(getUserRole());
      setIsLoading(false);
    };
    init();
  }, []);

  // Refresh user role when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        await initializeUserRole();
        setUserRoleState(getUserRole());
      };
      refresh();
    }, [])
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
            await setUserRole(newRole);
            setUserRoleState(newRole);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[baseStyles.text, styles.loadingText]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, isTablet && styles.profileHeaderTablet]}>
        <View style={[styles.avatarContainer, isTablet && styles.avatarContainerTablet]}>
          <Ionicons name="person" size={isTablet ? 80 : 64} color={Colors.primary} />
        </View>
        <Text style={[baseStyles.heading, styles.profileName, isTablet && styles.profileNameTablet]}>
          Profile
        </Text>
        <Text style={[baseStyles.text, styles.profileSubtitle, isTablet && styles.profileSubtitleTablet]}>
          Manage your account settings
        </Text>
      </View>

      {/* User Role Section */}
      <View style={[styles.section, isTablet && styles.sectionTablet]}>
        <Text style={[baseStyles.heading, styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
          Account Type
        </Text>
        <Text style={[baseStyles.text, styles.sectionDescription, isTablet && styles.sectionDescriptionTablet]}>
          Select your role to customize your experience
        </Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              userRole === 'coach' && styles.roleButtonActive,
              isTablet && styles.roleButtonTablet,
            ]}
            onPress={() => handleRoleChange('coach')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="people" 
              size={isTablet ? 32 : 28} 
              color={userRole === 'coach' ? Colors.white : Colors.primary} 
            />
            <Text
              style={[
                styles.roleButtonText,
                userRole === 'coach' && styles.roleButtonTextActive,
                isTablet && styles.roleButtonTextTablet,
              ]}
            >
              Coach
            </Text>
            {userRole === 'coach' && (
              <Ionicons name="checkmark-circle" size={isTablet ? 24 : 20} color={Colors.white} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              userRole === 'athlete' && styles.roleButtonActive,
              isTablet && styles.roleButtonTablet,
            ]}
            onPress={() => handleRoleChange('athlete')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="person" 
              size={isTablet ? 32 : 28} 
              color={userRole === 'athlete' ? Colors.white : Colors.primary} 
            />
            <Text
              style={[
                styles.roleButtonText,
                userRole === 'athlete' && styles.roleButtonTextActive,
                isTablet && styles.roleButtonTextTablet,
              ]}
            >
              Athlete
            </Text>
            {userRole === 'athlete' && (
              <Ionicons name="checkmark-circle" size={isTablet ? 24 : 20} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Section */}
      <View style={[styles.section, isTablet && styles.sectionTablet]}>
        <Text style={[baseStyles.heading, styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
          About
        </Text>
        <View style={styles.infoItem}>
          <Ionicons name="information-circle-outline" size={isTablet ? 24 : 20} color={Colors.textLight} />
          <View style={styles.infoContent}>
            <Text style={[baseStyles.text, styles.infoLabel, isTablet && styles.infoLabelTablet]}>
              Current Role
            </Text>
            <Text style={[baseStyles.text, styles.infoValue, isTablet && styles.infoValueTablet]}>
              {userRole === 'coach' ? 'Coach' : 'Athlete'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralBackground,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  profileHeaderTablet: {
    paddingVertical: 40,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarContainerTablet: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 28,
    color: Colors.primary,
    marginBottom: 8,
  },
  profileNameTablet: {
    fontSize: 36,
  },
  profileSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  profileSubtitleTablet: {
    fontSize: 18,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTablet: {
    padding: 28,
    borderRadius: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    color: Colors.primary,
    marginBottom: 8,
  },
  sectionTitleTablet: {
    fontSize: 24,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  sectionDescriptionTablet: {
    fontSize: 16,
    marginBottom: 24,
  },
  roleContainer: {
    gap: 12,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
  },
  roleButtonTablet: {
    padding: 20,
    borderRadius: 16,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  roleButtonTextTablet: {
    fontSize: 18,
  },
  roleButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  infoLabelTablet: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  infoValueTablet: {
    fontSize: 18,
  },
});
