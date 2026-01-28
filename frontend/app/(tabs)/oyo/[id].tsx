import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, baseStyles } from '../../../constants/styles';
import {
    getAthleteById,
    getAthleteName,
} from '../../../data/athletes';
import { addOyoSubmission, getOyoSubmissionsByDate, initializeOyoSubmissions } from '../../../data/oyoSubmissions';
import { Athlete } from '../../../data/types';
import { formatTimeArizona, normalizeDate } from '../../../utils/date';

export default function AthleteOyoSubmissionScreen() {
  const router = useRouter();
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const insets = useSafeAreaInsets();
  
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Get the selected date from params, default to today
  const selectedDate = useMemo(() => {
    if (date) {
      // Parse date from YYYY-MM-DD format
      const [year, month, day] = date.split('-').map(Number);
      return normalizeDate(new Date(year, month - 1, day));
    }
    return normalizeDate(new Date());
  }, [date]);

  // Get today's date for checking if submissions are allowed
  const today = normalizeDate(new Date());
  
  // Check if the selected date is today (only today allows submissions)
  const isToday = useMemo(() => {
    return selectedDate.getTime() === today.getTime();
  }, [selectedDate, today]);

  useEffect(() => {
    const init = async () => {
      // Reset state first when athlete changes
      setPhotoUri(undefined);
      setDescription('');
      setHasSubmitted(false);
      setSubmissionTime(null);
      setIsLoading(true);
      
      await initializeOyoSubmissions();
      
      if (id) {
        const athleteData = getAthleteById(id);
        if (athleteData) {
          setAthlete(athleteData);
          
          // Check if already submitted for the selected date
          const submissions = getOyoSubmissionsByDate(selectedDate);
          const dateSubmission = submissions.find(s => s.athleteId === id);
          if (dateSubmission) {
            setHasSubmitted(true);
            setPhotoUri(dateSubmission.photoUri);
            setDescription(dateSubmission.description || '');
            setSubmissionTime(dateSubmission.submittedAt);
          }
        }
      }
      setIsLoading(false);
    };
    init();
  }, [id, selectedDate]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photos to add a photo to your OYO submission.'
        );
        return;
      }

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
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your camera to take a photo for your OYO submission.'
        );
        return;
      }

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
    if (!athlete || !id) return;
    
    // Only allow submitting for today
    if (!isToday) {
      Alert.alert(
        'Submission Not Allowed',
        'You can only submit OYO workouts for today. Past and future dates are view-only.'
      );
      return;
    }
    
    if (!photoUri && !description.trim()) {
      Alert.alert(
        'Submission Required',
        'Please add at least a photo or description to submit your OYO workout.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await addOyoSubmission({
        athleteId: id,
        date: selectedDate,
        photoUri,
        description: description.trim() || undefined,
        submittedAt: new Date(),
      });
      
      await initializeOyoSubmissions();
      setModalMessage(`${athlete ? getAthleteName(athlete) : ''} - Submitted!`);
      setShowModal(true);
      setHasSubmitted(true);
      setSubmissionTime(new Date());
    } catch (error: any) {
      console.error('Error submitting OYO:', error);
      const errorMessage = error?.message || 'Failed to save submission. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = async () => {
    setShowModal(false);
    await initializeOyoSubmissions();
    router.push('/(tabs)/oyo');
  };

  const handleGoBack = () => {
    router.push('/(tabs)/oyo');
  };

  if (isLoading || !athlete) {
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

      {/* Athlete Name */}
      <View style={styles.nameContainer}>
        <Text style={[baseStyles.heading, styles.athleteName, isTablet && styles.athleteNameTablet]}>
          {athlete ? getAthleteName(athlete) : ''}
        </Text>
        {!isToday && (
          <Text style={[baseStyles.text, styles.viewOnlyNote, isTablet && styles.viewOnlyNoteTablet]}>
            View Only - Submissions only allowed for today
          </Text>
        )}
        {!hasSubmitted && isToday && (
          <Text style={[baseStyles.text, styles.submissionNote, isTablet && styles.submissionNoteTablet]}>
            Submissions are only allowed for today
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {!hasSubmitted ? (
          <View style={styles.contentContainer}>
            {!isToday ? (
              // View-only mode for past/future dates
              <View style={styles.viewOnlyContainer}>
                <Text style={[baseStyles.text, styles.viewOnlyText, isTablet && styles.viewOnlyTextTablet]}>
                  No submission for this date
                </Text>
                <Text style={[baseStyles.text, styles.viewOnlySubtext, isTablet && styles.viewOnlySubtextTablet]}>
                  Submissions are only allowed for today
                </Text>
              </View>
            ) : (
              // Submission form (only for today)
              <>
                {/* Photo Section */}
                <View style={styles.photoSection}>
                  <Text style={[baseStyles.text, styles.label, isTablet && styles.labelTablet]}>
                    Photo (optional)
                  </Text>
                  {photoUri ? (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: photoUri }} style={styles.photo} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={handleRemovePhoto}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={32} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addPhotoButton, isTablet && styles.addPhotoButtonTablet]}
                      onPress={handleShowImageOptions}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="camera-outline" size={isTablet ? 32 : 28} color={Colors.primary} />
                      <Text style={[baseStyles.text, styles.addPhotoText, isTablet && styles.addPhotoTextTablet]}>
                        Add Photo
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Description Section */}
                <View style={styles.descriptionSection}>
                  <Text style={[baseStyles.text, styles.label, isTablet && styles.labelTablet]}>
                    Description (optional)
                  </Text>
                  <TextInput
                    style={[styles.descriptionInput, isTablet && styles.descriptionInputTablet]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add notes about your workout…"
                    placeholderTextColor={Colors.neutralMedium}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[styles.submitButton, isTablet && styles.submitButtonTablet, submitting && styles.submitButtonDisabled]}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                    {submitting ? 'Submitting…' : 'Submit OYO'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <Text style={[baseStyles.text, styles.alreadySubmitted, isTablet && styles.alreadySubmittedTablet]}>
              Already Submitted!
            </Text>
            {submissionTime && (
              <Text style={[baseStyles.text, styles.submissionTime, isTablet && styles.submissionTimeTablet]}>
                Submitted at {formatTimeArizona(submissionTime)}
              </Text>
            )}
            
            {/* Show submitted photo if exists */}
            {photoUri && (
              <View style={styles.photoSection}>
                <Text style={[baseStyles.text, styles.label, isTablet && styles.labelTablet]}>
                  Photo
                </Text>
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                </View>
              </View>
            )}

            {/* Show submitted description if exists */}
            {description && (
              <View style={styles.descriptionSection}>
                <Text style={[baseStyles.text, styles.label, isTablet && styles.labelTablet]}>
                  Description
                </Text>
                <View style={[styles.descriptionDisplay, isTablet && styles.descriptionDisplayTablet]}>
                  <Text style={[baseStyles.text, styles.descriptionText, isTablet && styles.descriptionTextTablet]}>
                    {description}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <Text style={[baseStyles.text, styles.modalText, isTablet && styles.modalTextTablet]}>
              {modalMessage}
            </Text>
            <TouchableOpacity
              onPress={handleModalClose}
              style={[styles.modalButton, isTablet && styles.modalButtonTablet]}
            >
              <Text style={[styles.modalButtonText, isTablet && styles.modalButtonTextTablet]}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  goBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingBottom: 8,
    paddingLeft: 16,
  },
  goBackText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
  },
  athleteName: {
    fontSize: 32,
    color: Colors.primary,
    textAlign: 'center',
  },
  athleteNameTablet: {
    fontSize: 48,
  },
  submissionNote: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  submissionNoteTablet: {
    fontSize: 16,
  },
  viewOnlyNote: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 8,
    fontWeight: '600',
  },
  viewOnlyNoteTablet: {
    fontSize: 16,
  },
  viewOnlyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  viewOnlyText: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '600',
  },
  viewOnlyTextTablet: {
    fontSize: 24,
  },
  viewOnlySubtext: {
    fontSize: 16,
    color: Colors.textLight,
  },
  viewOnlySubtextTablet: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  contentContainer: {
    gap: 24,
  },
  contentContainerTablet: {
    gap: 28,
  },
  photoSection: {
    marginBottom: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  labelTablet: {
    fontSize: 18,
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutralMedium,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addPhotoButton: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: Colors.neutralBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addPhotoButtonTablet: {
    padding: 20,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  addPhotoTextTablet: {
    fontSize: 18,
  },
  descriptionSection: {
    marginBottom: 0,
  },
  descriptionInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutralMedium,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    minHeight: 100,
  },
  descriptionInputTablet: {
    padding: 20,
    fontSize: 18,
    minHeight: 120,
    borderRadius: 14,
  },
  descriptionDisplay: {
    backgroundColor: Colors.neutralBackground,
    borderWidth: 1,
    borderColor: Colors.neutralMedium,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
  },
  descriptionDisplayTablet: {
    padding: 20,
    borderRadius: 14,
    minHeight: 120,
  },
  descriptionText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  descriptionTextTablet: {
    fontSize: 18,
    lineHeight: 28,
  },
  submitButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: Colors.secondary,
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
    fontWeight: 'bold',
    color: Colors.white,
  },
  submitButtonTextTablet: {
    fontSize: 32,
  },
  alreadySubmitted: {
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  alreadySubmittedTablet: {
    fontSize: 32,
  },
  submissionTime: {
    fontSize: 16,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  submissionTimeTablet: {
    fontSize: 20,
    marginBottom: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 24,
  },
  modalContentTablet: {
    padding: 48,
    borderRadius: 20,
    maxWidth: 500,
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  modalTextTablet: {
    fontSize: 28,
  },
  modalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  modalButtonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 12,
    minWidth: 150,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextTablet: {
    fontSize: 20,
  },
});
