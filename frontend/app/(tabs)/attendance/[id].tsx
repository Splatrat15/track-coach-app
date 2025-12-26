import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, baseStyles } from '../../../constants/styles';
import {
  deleteAttendanceRecord,
  findOrCreateAttendanceRecord,
  getAthleteById,
  getAthleteName,
  getAttendanceRecordsByDate,
  initializeAttendanceRecords
} from '../../../data/athletes';
import { Athlete } from '../../../data/types';
import { normalizeDate } from '../../../utils/date';

export default function AthleteCheckInScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const insets = useSafeAreaInsets();
  
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Get today's date
  const today = normalizeDate(new Date());

  useEffect(() => {
    const init = async () => {
      await initializeAttendanceRecords();
      
      if (id) {
        const athleteData = getAthleteById(id);
        if (athleteData) {
          setAthlete(athleteData);
          
          // Check if already checked in today
          const records = getAttendanceRecordsByDate(today);
          const todayRecord = records.find(r => r.athleteId === id && r.status === 'present');
          setIsCheckedIn(!!todayRecord);
        }
      }
      setIsLoading(false);
    };
    init();
  }, [id, today]);

  const handleCheckIn = async () => {
    if (!athlete || !id) return;
    
    try {
      await findOrCreateAttendanceRecord(id, today, 'present');
      // Ensure data is saved
      await initializeAttendanceRecords();
      setModalMessage(`${athlete ? getAthleteName(athlete) : ''} - Checked In!`);
      setShowModal(true);
      setIsCheckedIn(true);
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const handleUndo = async () => {
    if (!athlete || !id) return;
    
    try {
      const records = getAttendanceRecordsByDate(today);
      const todayRecord = records.find(r => r.athleteId === id && r.status === 'present');
      if (todayRecord) {
        await deleteAttendanceRecord(todayRecord.id);
        setIsCheckedIn(false);
        router.back();
      }
    } catch (error) {
      console.error('Error undoing check-in:', error);
    }
  };

  const handleModalClose = async () => {
    setShowModal(false);
    // Ensure data is saved before navigating
    await initializeAttendanceRecords();
    // Navigate back - this will trigger useFocusEffect in parent screen
    router.back();
  };

  const handleGoBack = () => {
    router.back();
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
      </View>

      {/* Check In or Already Checked In */}
      {!isCheckedIn ? (
        <View style={styles.contentContainer}>
          <TouchableOpacity
            onPress={handleCheckIn}
            style={[styles.checkInButton, isTablet && styles.checkInButtonTablet]}
          >
            <Text style={[styles.checkInButtonText, isTablet && styles.checkInButtonTextTablet]}>
              Here
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <Text style={[baseStyles.text, styles.alreadyCheckedIn, isTablet && styles.alreadyCheckedInTablet]}>
            Already Checked In!
          </Text>
          <TouchableOpacity
            onPress={handleUndo}
            style={[styles.undoButton, isTablet && styles.undoButtonTablet]}
          >
            <Text style={[styles.undoButtonText, isTablet && styles.undoButtonTextTablet]}>
              (Undo)
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  checkInButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  checkInButtonTablet: {
    paddingVertical: 24,
    paddingHorizontal: 80,
    borderRadius: 16,
    minWidth: 300,
  },
  checkInButtonText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  checkInButtonTextTablet: {
    fontSize: 32,
  },
  alreadyCheckedIn: {
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  alreadyCheckedInTablet: {
    fontSize: 32,
  },
  undoButton: {
    backgroundColor: Colors.text,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  undoButtonTablet: {
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 16,
    minWidth: 200,
  },
  undoButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  undoButtonTextTablet: {
    fontSize: 24,
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

