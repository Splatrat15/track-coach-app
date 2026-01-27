import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, baseStyles } from '../../constants/styles';
import { getAllAthletes, getAthleteName } from '../../data/athletes';
import { getOyoSubmissionsByDate, initializeOyoSubmissions } from '../../data/oyoSubmissions';
import { Athlete, OyoSubmission } from '../../data/types';
import { formatTimeArizona, normalizeDate } from '../../utils/date';

export default function OyoSubmissionsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const insets = useSafeAreaInsets();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, OyoSubmission>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Get today's date for checking submissions
  const today = useMemo(() => {
    return normalizeDate(new Date());
  }, []);

  // Initialize data on mount
  useEffect(() => {
    const init = async () => {
      await initializeOyoSubmissions();
      setAthletes(getAllAthletes());
      loadSubmissions();
      setIsLoading(false);
    };
    init();
  }, []);

  // Refresh submissions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        await initializeOyoSubmissions();
        loadSubmissions();
        // Force re-render by updating athletes state
        setAthletes([...getAllAthletes()]);
      };
      refresh();
    }, [])
  );

  const loadSubmissions = () => {
    const dateSubmissions = getOyoSubmissionsByDate(today);
    const submissionsMap = new Map<string, OyoSubmission>();
    dateSubmissions.forEach(sub => {
      submissionsMap.set(sub.athleteId, sub);
    });
    setSubmissions(submissionsMap);
  };

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

  // Navigate to athlete submission screen
  const handleAthletePress = (athleteId: string) => {
    router.push(`/(tabs)/oyo/${athleteId}`);
  };

  // Navigate back to workout page
  const handleGoBack = () => {
    router.push('/(tabs)/workout');
  };

  if (isLoading) {
    return (
      <View style={[baseStyles.container, styles.container]}>
        <Text style={[baseStyles.text, styles.loadingText]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[baseStyles.container, styles.container]}>
      {/* Go Back Button - Respects Safe Area */}
      <TouchableOpacity 
        onPress={handleGoBack}
        style={[styles.goBackButton, { paddingTop: insets.top + 8 }]}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        <Text style={styles.goBackText}>Go Back</Text>
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && styles.contentContainerTablet
        ]}
        showsVerticalScrollIndicator={true}
      >
        <View style={[styles.header, isTablet && styles.headerTablet]}>
          <Text style={[baseStyles.heading, styles.title, isTablet && styles.titleTablet]}>
            OYO Submissions
          </Text>
          <Text style={[baseStyles.text, styles.subtitle, isTablet && styles.subtitleTablet]}>
            Tap a name to submit
          </Text>
        </View>

      {/* Gender Filters */}
      <View style={[styles.filtersContainer, isTablet && styles.filtersContainerTablet]}>
        <View style={[styles.filterGroup, isTablet && styles.filterGroupTablet]}>
          <Text style={[baseStyles.text, styles.filterLabel]}>Gender:</Text>
          {(['male', 'female'] as const).map(gender => (
            <TouchableOpacity
              key={gender}
              onPress={() => setSelectedGender(selectedGender === gender ? null : gender)}
              style={[
                styles.filterButton,
                selectedGender === gender && styles.filterButtonActive,
                isTablet && styles.filterButtonTablet
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                selectedGender === gender && styles.filterButtonTextActive
              ]}>
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Submission Counters */}
        <View style={[styles.countersContainer, isTablet && styles.countersContainerTablet]}>
          <View style={[styles.counterBadge, styles.counterBadgeSubmitted, isTablet && styles.counterBadgeTablet]}>
            <Text style={[styles.counterText, isTablet && styles.counterTextTablet]}>
              Submitted: {submissionCounts.submitted}
            </Text>
          </View>
          <View style={[styles.counterBadge, styles.counterBadgeNotSubmitted, isTablet && styles.counterBadgeTablet]}>
            <Text style={[styles.counterText, isTablet && styles.counterTextTablet]}>
              Not Submitted: {submissionCounts.notSubmitted}
            </Text>
          </View>
        </View>
      </View>

      {/* Athletes List */}
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <Text style={[baseStyles.text, styles.cardTitle, isTablet && styles.cardTitleTablet]}>
          Athletes ({sortedAthletes.length})
        </Text>

        {sortedAthletes.length === 0 ? (
          <Text style={[baseStyles.text, styles.emptyText, isTablet && styles.emptyTextTablet]}>
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
                style={[styles.athleteRow, isTablet && styles.athleteRowTablet]}
                activeOpacity={0.7}
              >
                <View style={styles.athleteNameContainer}>
                  <Text style={[baseStyles.text, styles.athleteName, isTablet && styles.athleteNameTablet]}>
                    {getAthleteName(athlete)}
                  </Text>
                  {hasSubmitted && submission && (
                    <Text style={[baseStyles.text, styles.submissionTime, isTablet && styles.submissionTimeTablet]}>
                      Submitted at {formatTimeArizona(submission.submittedAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.iconsContainer}>
                  {hasSubmitted && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={isTablet ? 28 : 24} 
                        color={Colors.secondary} 
                        style={styles.checkmarkIcon}
                      />
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color={Colors.textLight} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  goBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 8,
    paddingLeft: 16,
  },
  goBackText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
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
    alignSelf: 'center',
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
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.primary,
  },
  titleTablet: {
    fontSize: 52,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '500',
    marginTop: 4,
  },
  subtitleTablet: {
    fontSize: 20,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: Colors.textLight,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  cardTablet: {
    padding: 40,
    borderRadius: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  cardTitleTablet: {
    fontSize: 28,
    marginBottom: 24,
  },
  athleteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 4,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.neutralBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  athleteRowTablet: {
    paddingVertical: 22,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  athleteNameContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  athleteName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  athleteNameTablet: {
    fontSize: 22,
  },
  submissionTime: {
    fontSize: 12,
    color: Colors.secondaryDark,
    fontWeight: '500',
    marginTop: 4,
  },
  submissionTimeTablet: {
    fontSize: 14,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmarkContainer: {
    backgroundColor: Colors.secondaryLight + '20',
    borderRadius: 12,
    padding: 2,
  },
  checkmarkIcon: {
    marginRight: 0,
  },
  emptyText: {
    fontSize: 17,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 32,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  filterGroupTablet: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
    color: Colors.text,
    letterSpacing: -0.2,
    minWidth: 50,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.neutralBackground,
    marginRight: 6,
    marginBottom: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 70,
    alignItems: 'center',
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
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  filterButtonText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  filterButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  countersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  countersContainerTablet: {
    gap: 12,
    marginTop: 12,
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    shadowColor: Colors.black,
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
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryLight + '15',
  },
  counterBadgeNotSubmitted: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + '15',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 0.1,
  },
  counterTextTablet: {
    fontSize: 14,
  },
});
