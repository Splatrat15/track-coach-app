import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../../constants/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserRole } from '../../contexts/UserRoleContext';
import { getAllAthletes, initializeAthletes, refetchAthletes } from '../../data/athletes';
import { getAllCoaches } from '../../data/coaches';
import { Athlete, Coach } from '../../data/types';

/**
 * Format athlete name as "First Name Last Initial." for display in the everyone list
 */
function getAthleteNameShort(athlete: Athlete): string {
  if (athlete.lastName) {
    return `${athlete.firstName} ${athlete.lastName.charAt(0).toUpperCase()}.`;
  }
  return athlete.firstName;
}

/**
 * Format coach name for display (First Last)
 */
function getCoachName(coach: Coach): string {
  if (coach.lastName) {
    return `${coach.firstName} ${coach.lastName}`;
  }
  return coach.firstName || coach.username;
}

export default function EveryoneScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isCoach } = useUserRole();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    await initializeAthletes();
    setAthletes(getAllAthletes());
    const coachList = await getAllCoaches();
    setCoaches(coachList);
    setIsLoading(false);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh athletes and coaches when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        await refetchAthletes();
        setAthletes([...getAllAthletes()]);
        const coachList = await getAllCoaches();
        setCoaches(coachList);
      };
      refresh();
    }, [])
  );

  const s = getStyles(colors);

  if (isLoading) {
    return (
      <View style={[s.container, s.centered]}>
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={s.container}
      contentContainerStyle={[
        s.contentContainer,
        isTablet && s.contentContainerTablet
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[s.header, isTablet && s.headerTablet, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          style={s.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color={colors.primary} />
          <Text style={[s.backButtonText, isTablet && s.backButtonTextTablet]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, isTablet && s.titleTablet]}>
          Everyone
        </Text>
        <Text style={[s.subtitle, isTablet && s.subtitleTablet]}>
          View all coaches and athletes
        </Text>
      </View>

      {/* Coaches Section */}
      <View style={[s.section, isTablet && s.sectionTablet]}>
        <View style={s.sectionHeader}>
          <Ionicons name="people" size={isTablet ? 28 : 24} color={colors.primary} />
          <Text style={[s.sectionTitle, isTablet && s.sectionTitleTablet]}>
            Coaches ({coaches.length})
          </Text>
        </View>
        {coaches.length === 0 ? (
          <View style={[s.emptyCard, isTablet && s.emptyCardTablet]}>
            <Ionicons name="people-outline" size={isTablet ? 48 : 40} color={colors.textMuted} />
            <Text style={[s.emptyText, isTablet && s.emptyTextTablet]}>
              No coaches yet. Coaches appear here after signing up.
            </Text>
          </View>
        ) : (
          <View style={s.listContainer}>
            {coaches.map((coach) => (
              <View
                key={coach.id}
                style={[s.listItem, isTablet && s.listItemTablet]}
              >
                <View style={s.listItemContent}>
                  <View style={[s.avatar, isTablet && s.avatarTablet]}>
                    <Ionicons name="people" size={isTablet ? 24 : 20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[s.listItemText, isTablet && s.listItemTextTablet]}>
                      {getCoachName(coach)}
                    </Text>
                    <Text style={[s.coachUsername, isTablet && s.coachUsernameTablet]}>
                      @{coach.username}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Athletes Section */}
      <View style={[s.section, isTablet && s.sectionTablet]}>
        <View style={s.sectionHeader}>
          <Ionicons name="person" size={isTablet ? 28 : 24} color={colors.primary} />
          <Text style={[s.sectionTitle, isTablet && s.sectionTitleTablet]}>
            Athletes ({athletes.length})
          </Text>
        </View>
        
        {athletes.length === 0 ? (
          <View style={[s.emptyCard, isTablet && s.emptyCardTablet]}>
            <Ionicons name="person-outline" size={isTablet ? 48 : 40} color={colors.textMuted} />
            <Text style={[s.emptyText, isTablet && s.emptyTextTablet]}>
              No athletes yet
            </Text>
          </View>
        ) : (
          <View style={s.listContainer}>
            {athletes.map((athlete) => (
              <TouchableOpacity
                key={athlete.id}
                style={[s.listItem, isTablet && s.listItemTablet]}
                onPress={isCoach ? () => router.push(`/(tabs)/everyone/${athlete.id}`) : undefined}
                disabled={!isCoach}
                activeOpacity={isCoach ? 0.7 : 1}
              >
                <View style={s.listItemContent}>
                  <View style={[s.avatar, isTablet && s.avatarTablet]}>
                    <Ionicons name="person" size={isTablet ? 24 : 20} color={colors.primary} />
                  </View>
                  <Text style={[s.listItemText, isTablet && s.listItemTextTablet]}>
                    {getAthleteNameShort(athlete)}
                  </Text>
                </View>
                <View style={s.listItemRight}>
                  {athlete.gender && (
                    <View style={[s.badge, athlete.gender === 'male' ? s.badgeMale : s.badgeFemale]}>
                      <Text style={[s.badgeText, isTablet && s.badgeTextTablet]}>
                        {athlete.gender.charAt(0).toUpperCase() + athlete.gender.slice(1)}
                      </Text>
                    </View>
                  )}
                  {isCoach && (
                    <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={colors.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function getStyles(colors: ThemeColors) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.neutralBackground,
    },
    centered: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textLight,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    contentContainerTablet: {
      maxWidth: 1200,
      alignSelf: 'center' as const,
      width: '100%',
      paddingHorizontal: 40,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 24,
    },
    headerTablet: {
      marginBottom: 32,
    },
    backButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 16,
      gap: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600' as const,
    },
    backButtonTextTablet: {
      fontSize: 18,
    },
    title: {
      fontSize: 32,
      marginBottom: 8,
      fontWeight: 'bold' as const,
      color: colors.text,
    },
    titleTablet: {
      fontSize: 48,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      opacity: 0.7,
      color: colors.text,
    },
    subtitleTablet: {
      fontSize: 20,
    },
    section: {
      backgroundColor: colors.neutralLight,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.black,
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
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      color: colors.primary,
      fontWeight: 'bold' as const,
    },
    sectionTitleTablet: {
      fontSize: 24,
    },
    emptyCard: {
      backgroundColor: colors.neutralBackground,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
      borderStyle: 'dashed' as const,
    },
    emptyCardTablet: {
      padding: 48,
      borderRadius: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: 12,
      textAlign: 'center' as const,
    },
    emptyTextTablet: {
      fontSize: 18,
      marginTop: 16,
    },
    listContainer: {
      gap: 8,
    },
    listItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: colors.neutralBackground,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    listItemRight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    listItemTablet: {
      padding: 16,
      borderRadius: 16,
    },
    listItemContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
      gap: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.neutralLight,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarTablet: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    listItemText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    listItemTextTablet: {
      fontSize: 18,
    },
    coachUsername: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    coachUsernameTablet: {
      fontSize: 14,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeMale: {
      backgroundColor: colors.primary + '20',
    },
    badgeFemale: {
      backgroundColor: '#FF69B4' + '20',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
    },
    badgeTextTablet: {
      fontSize: 14,
    },
  };
}
