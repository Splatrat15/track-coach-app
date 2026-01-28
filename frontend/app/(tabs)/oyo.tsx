import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../../constants/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { getAllAthletes, getAthleteName, refetchAthletes } from '../../data/athletes';
import { getOyoSubmissionsByDate, initializeOyoSubmissions } from '../../data/oyoSubmissions';
import { Athlete, OyoSubmission } from '../../data/types';
import { formatDate, formatTimeArizona, getDateKey, normalizeDate } from '../../utils/date';

export default function OyoSubmissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const isTablet = width >= 768;
  const insets = useSafeAreaInsets();
  const s = getStyles(colors);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, OyoSubmission>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Get the selected date from params, default to today
  const selectedDate = useMemo(() => {
    if (params.date) {
      // Parse date from YYYY-MM-DD format
      const [year, month, day] = params.date.split('-').map(Number);
      return normalizeDate(new Date(year, month - 1, day));
    }
    return normalizeDate(new Date());
  }, [params.date]);

  // Get today's date for checking if submissions are allowed
  const today = useMemo(() => {
    return normalizeDate(new Date());
  }, []);

  // Check if the selected date is today (only today allows submissions)
  const isToday = useMemo(() => {
    return selectedDate.getTime() === today.getTime();
  }, [selectedDate, today]);

  // Load submissions for the selected date
  const loadSubmissions = useCallback(() => {
    const dateSubmissions = getOyoSubmissionsByDate(selectedDate);
    const submissionsMap = new Map<string, OyoSubmission>();
    dateSubmissions.forEach(sub => {
      submissionsMap.set(sub.athleteId, sub);
    });
    setSubmissions(submissionsMap);
  }, [selectedDate]);

  // Initialize data on mount and when date changes
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await initializeOyoSubmissions();
      setAthletes(getAllAthletes());
      loadSubmissions();
      setIsLoading(false);
    };
    init();
  }, [selectedDate, loadSubmissions]);

  // Refresh submissions and athlete list when screen comes into focus (e.g. after add/remove on Attendance)
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        await refetchAthletes();
        await initializeOyoSubmissions();
        loadSubmissions();
        setAthletes([...getAllAthletes()]);
      };
      refresh();
    }, [loadSubmissions])
  );

  // Check if an athlete has submitted today
  const hasAthleteSubmitted = (athleteId: string): boolean => {
    return submissions.has(athleteId);
  };

  // Get submission for athlete
  const getAthleteSubmission = (athleteId: string): OyoSubmission | undefined => {
    return submissions.get(athleteId);
  };

  // Filter athletes by gender if filter is selected
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const filteredAthletes = useMemo(() => {
    if (!selectedGender) {
      return athletes;
    }
    return athletes.filter(athlete => athlete.gender === selectedGender);
  }, [athletes, selectedGender]);

  // Athletes are already sorted by last name from the database
  const sortedAthletes = filteredAthletes;

  // Calculate submitted and not submitted counts
  const submissionCounts = useMemo(() => {
    const submitted = sortedAthletes.filter(athlete => 
      hasAthleteSubmitted(athlete.id)
    ).length;
    const notSubmitted = sortedAthletes.length - submitted;
    return { submitted, notSubmitted };
  }, [sortedAthletes, submissions]);

  // Navigate to athlete submission screen with the selected date
  const handleAthletePress = (athleteId: string) => {
    const dateKey = getDateKey(selectedDate);
    router.push(`/(tabs)/oyo/${athleteId}?date=${dateKey}`);
  };

  // Navigate back to workout page
  const handleGoBack = () => {
    router.push('/(tabs)/workout');
  };

  if (isLoading) {
    return (
      <View style={s.container}>
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Go Back Button - Respects Safe Area */}
      <TouchableOpacity 
        onPress={handleGoBack}
        style={[s.goBackButton, { paddingTop: insets.top + 8 }]}
      >
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
        <Text style={s.goBackText}>Go Back</Text>
      </TouchableOpacity>

      <ScrollView 
        style={s.scrollView}
        contentContainerStyle={[
          s.contentContainer,
          isTablet && s.contentContainerTablet
        ]}
        showsVerticalScrollIndicator={true}
      >
        <View style={[s.header, isTablet && s.headerTablet]}>
          <Text style={[s.title, isTablet && s.titleTablet]}>
            OYO Submissions
          </Text>
          <Text style={[s.dateLabel, isTablet && s.dateLabelTablet]}>
            {formatDate(selectedDate)}
          </Text>
          <Text style={[s.subtitle, isTablet && s.subtitleTablet]}>
            {isToday ? 'Tap a name to submit' : 'View only - Submissions only allowed for today'}
          </Text>
        </View>

      {/* Gender Filters */}
      <View style={[s.filtersContainer, isTablet && s.filtersContainerTablet]}>
        <View style={[s.filterGroup, isTablet && s.filterGroupTablet]}>
          <Text style={s.filterLabel}>Gender:</Text>
          {(['male', 'female'] as const).map(gender => (
            <TouchableOpacity
              key={gender}
              onPress={() => setSelectedGender(selectedGender === gender ? null : gender)}
              style={[
                s.filterButton,
                selectedGender === gender && s.filterButtonActive,
                isTablet && s.filterButtonTablet
              ]}
            >
              <Text style={[
                s.filterButtonText,
                selectedGender === gender && s.filterButtonTextActive
              ]}>
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Submission Counters */}
        <View style={[s.countersContainer, isTablet && s.countersContainerTablet]}>
          <View style={[s.counterBadge, s.counterBadgeSubmitted, isTablet && s.counterBadgeTablet]}>
            <Text style={[s.counterText, isTablet && s.counterTextTablet]}>
              Submitted: {submissionCounts.submitted}
            </Text>
          </View>
          <View style={[s.counterBadge, s.counterBadgeNotSubmitted, isTablet && s.counterBadgeTablet]}>
            <Text style={[s.counterText, isTablet && s.counterTextTablet]}>
              Not Submitted: {submissionCounts.notSubmitted}
            </Text>
          </View>
        </View>
      </View>

      {/* Athletes List */}
      <View style={[s.card, isTablet && s.cardTablet]}>
        <Text style={[s.cardTitle, isTablet && s.cardTitleTablet]}>
          Athletes ({sortedAthletes.length})
        </Text>

        {sortedAthletes.length === 0 ? (
          <Text style={[s.emptyText, isTablet && s.emptyTextTablet]}>
            No athletes yet.
          </Text>
        ) : (
          sortedAthletes.map((athlete) => {
            const hasSubmitted = hasAthleteSubmitted(athlete.id);
            const submission = getAthleteSubmission(athlete.id);
            return (
              <TouchableOpacity
                key={athlete.id}
                onPress={() => handleAthletePress(athlete.id)}
                style={[
                  s.athleteRow, 
                  isTablet && s.athleteRowTablet,
                  !isToday && s.athleteRowViewOnly
                ]}
                activeOpacity={0.7}
              >
                <View style={s.athleteNameContainer}>
                  <Text style={[s.athleteName, isTablet && s.athleteNameTablet]}>
                    {getAthleteName(athlete)}
                  </Text>
                  {hasSubmitted && submission && (
                    <Text style={[s.submissionTime, isTablet && s.submissionTimeTablet]}>
                      Submitted at {formatTimeArizona(submission.submittedAt)}
                    </Text>
                  )}
                </View>
                <View style={s.iconsContainer}>
                  {hasSubmitted && (
                    <View style={s.checkmarkContainer}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={isTablet ? 28 : 24} 
                        color={colors.secondary} 
                        style={s.checkmarkIcon}
                      />
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={colors.textLight} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      </ScrollView>
    </View>
  );
}

function getStyles(colors: ThemeColors) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.neutralBackground,
    },
    goBackButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginBottom: 16,
      paddingBottom: 8,
      paddingLeft: 16,
    },
    goBackText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600' as const,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 24,
    },
    contentContainerTablet: {
      maxWidth: 1200,
      alignSelf: 'center' as const,
      width: '100%',
      paddingHorizontal: 48,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 28,
      paddingTop: 8,
    },
    headerTablet: {
      marginBottom: 36,
      paddingTop: 12,
    },
    title: {
      fontSize: 36,
      marginBottom: 10,
      fontWeight: '800' as const,
      letterSpacing: -0.5,
      color: colors.primary,
    },
    titleTablet: {
      fontSize: 52,
      marginBottom: 12,
    },
    dateLabel: {
      fontSize: 18,
      color: colors.primary,
      fontWeight: '600' as const,
      marginTop: 8,
      marginBottom: 4,
    },
    dateLabelTablet: {
      fontSize: 22,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textLight,
      fontWeight: '500' as const,
      marginTop: 4,
    },
    subtitleTablet: {
      fontSize: 20,
    },
    loadingText: {
      fontSize: 18,
      textAlign: 'center' as const,
      marginTop: 50,
      color: colors.textLight,
    },
    card: {
      backgroundColor: colors.neutralLight,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    cardTablet: {
      padding: 40,
      borderRadius: 24,
      marginBottom: 24,
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      marginBottom: 20,
      color: colors.text,
      letterSpacing: -0.3,
    },
    cardTitleTablet: {
      fontSize: 28,
      marginBottom: 24,
    },
    athleteRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 18,
      paddingHorizontal: 4,
      marginVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.neutralBackground,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    athleteRowTablet: {
      paddingVertical: 22,
      paddingHorizontal: 8,
      borderRadius: 16,
    },
    athleteRowViewOnly: {
      opacity: 0.7,
    },
    athleteNameContainer: {
      flexDirection: 'column' as const,
      flex: 1,
    },
    athleteName: {
      fontSize: 18,
      fontWeight: '600' as const,
      flex: 1,
      color: colors.text,
      letterSpacing: -0.2,
    },
    athleteNameTablet: {
      fontSize: 22,
    },
    submissionTime: {
      fontSize: 12,
      color: colors.secondaryDark,
      fontWeight: '500' as const,
      marginTop: 4,
    },
    submissionTimeTablet: {
      fontSize: 14,
    },
    iconsContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    checkmarkContainer: {
      backgroundColor: colors.secondaryLight + '20',
      borderRadius: 12,
      padding: 2,
    },
    checkmarkIcon: {
      marginRight: 0,
    },
    emptyText: {
      fontSize: 17,
      color: colors.textLight,
      textAlign: 'center' as const,
      paddingVertical: 32,
      fontWeight: '500' as const,
      lineHeight: 24,
    },
    emptyTextTablet: {
      fontSize: 21,
      paddingVertical: 40,
      lineHeight: 30,
    },
    filtersContainer: {
      marginBottom: 20,
      paddingHorizontal: 0,
    },
    filtersContainerTablet: {
      marginBottom: 24,
      paddingHorizontal: 0,
    },
    filterGroup: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      marginBottom: 12,
    },
    filterGroupTablet: {
      marginBottom: 16,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '700' as const,
      marginRight: 10,
      color: colors.text,
      letterSpacing: -0.2,
      minWidth: 50,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.neutralLight,
      borderWidth: 2,
      borderColor: colors.neutralBackground,
      marginRight: 6,
      marginBottom: 6,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
      minWidth: 70,
      alignItems: 'center' as const,
    },
    filterButtonTablet: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginRight: 10,
      marginBottom: 0,
      minWidth: 90,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    filterButtonText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
    },
    filterButtonTextActive: {
      color: colors.white,
      fontWeight: '700' as const,
    },
    countersContainer: {
      flexDirection: 'row' as const,
      gap: 8,
      marginTop: 8,
      flexWrap: 'wrap' as const,
    },
    countersContainerTablet: {
      gap: 12,
      marginTop: 12,
    },
    counterBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.neutralLight,
      borderWidth: 1.5,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    counterBadgeTablet: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    counterBadgeSubmitted: {
      borderColor: colors.secondary,
      backgroundColor: colors.secondaryLight + '15',
    },
    counterBadgeNotSubmitted: {
      borderColor: colors.error,
      backgroundColor: colors.error + '15',
    },
    counterText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
      letterSpacing: 0.1,
    },
    counterTextTablet: {
      fontSize: 14,
    },
  };
}
