import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useTheme } from '../contexts/ThemeContext';
import { getAllAthletes, getAthleteName } from '../data/athletes';
import { addOyoSubmission, getOyoSubmissionsByDate, initializeOyoSubmissions } from '../data/oyoSubmissions';
import { Athlete, OyoSubmission } from '../data/types';
import { formatTimeArizona, normalizeDate } from '../utils/date';

interface OyoSubmissionModalProps {
  visible: boolean;
  onClose: () => void;
  date: Date;
  isTablet: boolean;
}

export default function OyoSubmissionModal({ 
  visible, 
  onClose, 
  date,
  isTablet 
}: OyoSubmissionModalProps) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>('');
  const [submissions, setSubmissions] = useState<Map<string, OyoSubmission>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    } else {
      // Reset state when modal closes
      setSelectedAthlete(null);
      setPhotoUri(undefined);
      setDescription('');
    }
  }, [visible, date]);

  const loadData = async () => {
    await initializeOyoSubmissions();
    const allAthletes = getAllAthletes();
    setAthletes(allAthletes);

    // Load existing submissions for this date
    const dateSubmissions = getOyoSubmissionsByDate(date);
    const submissionsMap = new Map<string, OyoSubmission>();
    dateSubmissions.forEach(sub => {
      submissionsMap.set(sub.athleteId, sub);
    });
    setSubmissions(submissionsMap);
  };

  const handleSelectAthlete = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    // Load existing submission for this athlete if it exists
    const existing = submissions.get(athlete.id);
    if (existing) {
      setPhotoUri(existing.photoUri);
      setDescription(existing.description || '');
    } else {
      setPhotoUri(undefined);
      setDescription('');
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photos to add a photo to your OYO submission.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your camera to take a photo for your OYO submission.'
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleShowImageOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setPhotoUri(undefined)
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!selectedAthlete) {
      Alert.alert('Error', 'Please select an athlete.');
      return;
    }

    if (!photoUri && !description.trim()) {
      Alert.alert(
        'Submission Required',
        'Please add at least a photo or description to submit your OYO workout.'
      );
      return;
    }

    setLoading(true);
    try {
      const submission = await addOyoSubmission({
        athleteId: selectedAthlete.id,
        date: normalizeDate(date),
        photoUri,
        description: description.trim() || undefined,
        submittedAt: new Date(),
      });

      // Update local state
      const newSubmissions = new Map(submissions);
      newSubmissions.set(selectedAthlete.id, submission);
      setSubmissions(newSubmissions);

      Alert.alert(
        'Success',
        'Your OYO submission has been saved!',
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedAthlete(null);
              setPhotoUri(undefined);
              setDescription('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting OYO:', error);
      Alert.alert('Error', 'Failed to save submission. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={s.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[
            s.modalContent,
            isTablet && s.modalContentTablet,
            selectedAthlete && s.modalContentSubmission,
          ]}
        >
          {!selectedAthlete ? (
            // List view – exactly like Attendance page: card with athlete list
            <ScrollView
              style={s.modalScrollView}
              contentContainerStyle={s.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={s.modalHeader}>
                <Text style={[ s.modalTitle, isTablet && s.modalTitleTablet]}>
                  OYO Submissions
                </Text>
                <Text style={[ s.modalSubtitle, isTablet && s.modalSubtitleTablet]}>
                  Tap a name to submit
                </Text>
                <TouchableOpacity
                  style={[s.modalCloseButton, isTablet && s.modalCloseButtonTablet]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={isTablet ? 24 : 20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Athletes List Card - exactly like Attendance */}
              <View style={[s.card, isTablet && s.cardTablet]}>
                <Text style={[ s.cardTitle, isTablet && s.cardTitleTablet]}>
                  Athletes ({athletes.length})
                </Text>

                {athletes.length === 0 ? (
                  <Text style={[ s.emptyText, isTablet && s.emptyTextTablet]}>
                    No athletes yet.
                  </Text>
                ) : (
                  athletes.map((athlete) => {
                    const submission = submissions.get(athlete.id);
                    const hasSubmission = !!submission;
                    return (
                      <TouchableOpacity
                        key={athlete.id}
                        onPress={() => handleSelectAthlete(athlete)}
                        style={[s.athleteRow, isTablet && s.athleteRowTablet]}
                        activeOpacity={0.7}
                      >
                        <View style={s.athleteNameContainer}>
                          <Text style={[ s.athleteName, isTablet && s.athleteNameTablet]}>
                            {getAthleteName(athlete)}
                          </Text>
                          {hasSubmission && (
                            <Text style={[ s.submissionTime, isTablet && s.submissionTimeTablet]}>
                              Submitted at {formatTimeArizona(submission.submittedAt)}
                            </Text>
                          )}
                        </View>
                        <View style={s.iconsContainer}>
                          {hasSubmission && (
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
          ) : (
            // Submission view – like Attendance [id]: back, name, then submit form
            <View style={s.submissionViewWrapper}>
              <TouchableOpacity
                style={[s.goBackButton, isTablet && s.goBackButtonTablet]}
                onPress={() => {
                  setSelectedAthlete(null);
                  setPhotoUri(undefined);
                  setDescription('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={isTablet ? 24 : 20} color={colors.primary} />
                <Text style={[ s.goBackText, isTablet && s.goBackTextTablet]}>
                  Back to Athletes
                </Text>
              </TouchableOpacity>

              <View style={[s.nameContainer, isTablet && s.nameContainerTablet]}>
                <Text style={[ s.athleteNameLarge, isTablet && s.athleteNameLargeTablet]}>
                  {getAthleteName(selectedAthlete)}
                </Text>
              </View>

              <ScrollView
                style={s.formScroll}
                contentContainerStyle={s.formScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={[s.contentContainer, isTablet && s.contentContainerTablet]}>
                  {/* Photo */}
                  <View style={s.photoSection}>
                    <Text style={[ s.label, isTablet && s.labelTablet]}>
                      Photo (optional)
                    </Text>
                    {photoUri ? (
                      <View style={s.photoContainer}>
                        <Image source={{ uri: photoUri }} style={s.photo} />
                        <TouchableOpacity
                          style={s.removePhotoButton}
                          onPress={handleRemovePhoto}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={32} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[s.addPhotoButton, isTablet && s.addPhotoButtonTablet]}
                        onPress={handleShowImageOptions}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="camera-outline" size={isTablet ? 32 : 28} color={colors.primary} />
                        <Text style={[ s.addPhotoText, isTablet && s.addPhotoTextTablet]}>
                          Add Photo
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Description */}
                  <View style={s.descriptionSection}>
                    <Text style={[ s.label, isTablet && s.labelTablet]}>
                      Description (optional)
                    </Text>
                    <TextInput
                      style={[s.descriptionInput, isTablet && s.descriptionInputTablet]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Add notes about your workout…"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Submit – like Attendance "Here" button */}
                  <TouchableOpacity
                    style={[
                      s.submitButton,
                      isTablet && s.submitButtonTablet,
                      loading && s.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text style={[ s.submitButtonText, isTablet && s.submitButtonTextTablet]}>
                      {loading ? 'Submitting…' : 'Submit OYO'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function getStyles(colors: ThemeColors) {
  return {
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    modalContent: {
      backgroundColor: colors.neutralLight,
      borderRadius: 24,
      padding: 24,
      width: '90%' as const,
      maxWidth: 500,
      maxHeight: '85%' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 2,
      borderColor: colors.neutralMedium,
    },
    modalContentTablet: {
      padding: 40,
      borderRadius: 28,
      maxWidth: 600,
    },
    modalContentSubmission: {
      maxWidth: 480,
      height: '85%' as const,
    },
    submissionViewWrapper: {
      flex: 1,
      minHeight: 320,
    },
    modalScrollView: {
      flex: 1,
    },
    modalScrollContent: {
      paddingBottom: 8,
    },
    modalHeader: {
      marginBottom: 28,
      paddingTop: 8,
      paddingRight: 44,
      position: 'relative' as const,
    },
    modalTitle: {
      fontSize: 36,
      marginBottom: 10,
      fontWeight: '800' as const,
      letterSpacing: -0.5,
      color: colors.primary,
    },
    modalTitleTablet: {
      fontSize: 52,
      marginBottom: 12,
    },
    modalSubtitle: {
      fontSize: 16,
      color: colors.textLight,
      fontWeight: '500' as const,
      marginTop: 4,
    },
    modalSubtitleTablet: {
      fontSize: 20,
    },
    modalCloseButton: {
      position: 'absolute' as const,
      top: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.neutralBackground,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    modalCloseButtonTablet: {
      width: 40,
      height: 40,
      borderRadius: 20,
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
    goBackButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginBottom: 16,
    },
    goBackButtonTablet: {
      marginBottom: 20,
    },
    goBackText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600' as const,
    },
    goBackTextTablet: {
      fontSize: 18,
    },
    nameContainer: {
      alignItems: 'center' as const,
      marginBottom: 32,
      paddingVertical: 16,
    },
    nameContainerTablet: {
      marginBottom: 40,
      paddingVertical: 20,
    },
    athleteNameLarge: {
      fontSize: 32,
      color: colors.primary,
      textAlign: 'center' as const,
    },
    athleteNameLargeTablet: {
      fontSize: 48,
    },
    contentContainer: {
      gap: 24,
      paddingBottom: 24,
    },
    contentContainerTablet: {
      gap: 28,
      paddingBottom: 32,
    },
    photoSection: {
      marginBottom: 0,
    },
    label: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    labelTablet: {
      fontSize: 18,
    },
    photoContainer: {
      position: 'relative' as const,
      width: '100%' as const,
      aspectRatio: 4 / 3,
      borderRadius: 12,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    photo: {
      width: '100%' as const,
      height: '100%' as const,
      resizeMode: 'cover' as const,
    },
    removePhotoButton: {
      position: 'absolute' as const,
      top: 8,
      right: 8,
      backgroundColor: colors.neutralLight,
      borderRadius: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    addPhotoButton: {
      width: '100%' as const,
      aspectRatio: 4 / 3,
      backgroundColor: colors.neutralBackground,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    addPhotoButtonTablet: {
      padding: 20,
    },
    addPhotoText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    addPhotoTextTablet: {
      fontSize: 18,
    },
    descriptionSection: {
      marginBottom: 0,
    },
    descriptionInput: {
      backgroundColor: colors.neutralLight,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      minHeight: 100,
    },
    descriptionInputTablet: {
      padding: 20,
      fontSize: 18,
      minHeight: 120,
      borderRadius: 14,
    },
    formScroll: {
      flex: 1,
    },
    formScrollContent: {
      flexGrow: 1,
    },
    submitButton: {
      backgroundColor: colors.secondary,
      paddingVertical: 20,
      paddingHorizontal: 60,
      borderRadius: 12,
      minWidth: 200,
      alignItems: 'center' as const,
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    submitButtonTablet: {
      paddingVertical: 24,
      paddingHorizontal: 80,
      borderRadius: 16,
      minWidth: 300,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: colors.white,
    },
    submitButtonTextTablet: {
      fontSize: 32,
    },
  };
}
