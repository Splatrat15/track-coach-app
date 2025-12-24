import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, Platform } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, baseStyles } from '../../constants/styles';
import { getAllAthletes } from '../../data/athletes';
import { 
  getAttendanceRecordsByDate, 
  findOrCreateAttendanceRecord,
  deleteAttendanceRecord,
  initializeAttendanceRecords 
} from '../../data/attendance';
import { AttendanceRecord } from '../../data/types';

type AttendanceStatus = 'present' | 'tardy' | 'absent' | null;

export default function AttendanceScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const athletes = getAllAthletes();
  
  // Get today's date (set to start of day for comparison)
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(today));
  
  // Load attendance records for selected date
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize attendance data on mount
  useEffect(() => {
    const init = async () => {
      await initializeAttendanceRecords();
      setIsLoading(false);
      // Load initial data
      const records = getAttendanceRecordsByDate(selectedDate);
      setAttendanceRecords(records);
      const attendanceMap: Record<string, AttendanceStatus> = {};
      records.forEach(record => {
        attendanceMap[record.athleteId] = record.status as AttendanceStatus;
      });
      setAttendance(attendanceMap);
    };
    init();
  }, []);

  // Check if selected date is today
  const isToday = useMemo(() => {
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() === today.getTime();
  }, [selectedDate, today]);

  // Check if selected date is in the past or future (not today)
  const isPastDate = useMemo(() => {
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() !== today.getTime();
  }, [selectedDate, today]);

  // Load attendance for selected date
  useEffect(() => {
    if (!isLoading) {
      const records = getAttendanceRecordsByDate(selectedDate);
      setAttendanceRecords(records);
      
      // Convert records to attendance state
      const attendanceMap: Record<string, AttendanceStatus> = {};
      records.forEach(record => {
        attendanceMap[record.athleteId] = record.status as AttendanceStatus;
      });
      setAttendance(attendanceMap);
    }
  }, [selectedDate, isLoading]);

  // Sort athletes by last name alphabetically
  const sortedAthletes = useMemo(() => {
    return [...athletes].sort((a, b) => {
      const aLastName = a.name.split(' ').pop() || '';
      const bLastName = b.name.split(' ').pop() || '';
      return aLastName.localeCompare(bLastName);
    });
  }, [athletes]);

  // Handle attendance status change (only for today)
  const handleStatusChange = async (athleteId: string, status: AttendanceStatus) => {
    if (isPastDate) return; // Don't allow changes to past dates

    const newStatus = attendance[athleteId] === status ? null : status;
    
    // Update local state immediately for responsive UI
    setAttendance(prev => ({
      ...prev,
      [athleteId]: newStatus,
    }));

    // Find existing record
    const existingRecord = attendanceRecords.find(r => r.athleteId === athleteId);
    
    if (newStatus === null) {
      // Delete record if status is cleared
      if (existingRecord) {
        await deleteAttendanceRecord(existingRecord.id);
        // Reload records to update state
        const records = getAttendanceRecordsByDate(selectedDate);
        setAttendanceRecords(records);
      }
    } else {
      // Create or update record
      await findOrCreateAttendanceRecord(athleteId, selectedDate, newStatus);
      // Reload records to update state
      const records = getAttendanceRecordsByDate(selectedDate);
      setAttendanceRecords(records);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const statuses = Object.values(attendance);
    return {
      present: statuses.filter(s => s === 'present').length,
      tardy: statuses.filter(s => s === 'tardy').length,
      absent: statuses.filter(s => s === 'absent').length,
      total: sortedAthletes.length,
    };
  }, [attendance, sortedAthletes.length]);

  // Format date for display
  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    
    if (selected.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (selected.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date(today));
  };

  return (
    <ScrollView 
      style={[baseStyles.container, styles.container]}
      contentContainerStyle={[
        styles.contentContainer,
        isTablet && styles.contentContainerTablet
      ]}
    >
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <Text style={[baseStyles.heading, styles.title, isTablet && styles.titleTablet]}>
          Attendance
        </Text>
        <Text style={[baseStyles.text, styles.subtitle, isTablet && styles.subtitleTablet]}>
          Track athlete attendance for practice
        </Text>
      </View>

      {/* Date Selector */}
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <View style={styles.dateSelector}>
          <TouchableOpacity 
            onPress={goToPreviousDay}
            style={styles.dateNavButton}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.dateDisplay}>
            <Text style={[baseStyles.text, styles.dateText]}>
              {formatDate(selectedDate)}
            </Text>
            {isPastDate && (
              <Text style={[baseStyles.text, styles.readOnlyLabel]}>
                (View Only)
              </Text>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={goToNextDay}
            style={styles.dateNavButton}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={Colors.primary} 
            />
          </TouchableOpacity>
        </View>
        
        {!isToday && (
          <TouchableOpacity 
            onPress={goToToday}
            style={styles.todayButton}
          >
            <Text style={styles.todayButtonText}>Go to Today</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Statistics Card */}
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <Text style={[baseStyles.text, styles.cardTitle]}>
          {isToday ? "Today's" : formatDate(selectedDate)} Attendance
        </Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: Colors.secondary }]}>
            <Text style={styles.statusText}>Present: {stats.present}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.statusText}>Tardy: {stats.tardy}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: Colors.text }]}>
            <Text style={[styles.statusText, { color: Colors.white }]}>Absent: {stats.absent}</Text>
          </View>
        </View>
      </View>

      {/* Athletes List */}
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <Text style={[baseStyles.text, styles.cardTitle]}>Athletes ({stats.total})</Text>
        {sortedAthletes.map((athlete) => {
          const currentStatus = attendance[athlete.id] || null;
          const isDisabled = isPastDate;
          
          return (
            <View key={athlete.id} style={styles.athleteRow}>
              <Text style={[baseStyles.text, styles.athleteName]}>{athlete.name}</Text>
              <View style={styles.buttonContainer}>
                {/* Present Button - Checkmark */}
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    currentStatus === 'present' && styles.statusButtonActive,
                    { backgroundColor: currentStatus === 'present' ? Colors.secondary : Colors.neutralBackground },
                    isDisabled && styles.statusButtonDisabled
                  ]}
                  onPress={() => handleStatusChange(athlete.id, 'present')}
                  disabled={isDisabled}
                >
                  <Ionicons 
                    name="checkmark" 
                    size={isTablet ? 24 : 20} 
                    color={currentStatus === 'present' ? Colors.white : (isDisabled ? Colors.neutralBackground : Colors.text)} 
                  />
                </TouchableOpacity>

                {/* Tardy Button - Circle */}
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    currentStatus === 'tardy' && styles.statusButtonActive,
                    { backgroundColor: currentStatus === 'tardy' ? '#F59E0B' : Colors.neutralBackground },
                    isDisabled && styles.statusButtonDisabled
                  ]}
                  onPress={() => handleStatusChange(athlete.id, 'tardy')}
                  disabled={isDisabled}
                >
                  <Ionicons 
                    name="ellipse-outline" 
                    size={isTablet ? 24 : 20} 
                    color={currentStatus === 'tardy' ? Colors.white : (isDisabled ? Colors.neutralBackground : Colors.text)} 
                  />
                </TouchableOpacity>

                {/* Absent Button - X */}
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    currentStatus === 'absent' && styles.statusButtonActive,
                    { backgroundColor: currentStatus === 'absent' ? Colors.text : Colors.neutralBackground },
                    isDisabled && styles.statusButtonDisabled
                  ]}
                  onPress={() => handleStatusChange(athlete.id, 'absent')}
                  disabled={isDisabled}
                >
                  <Ionicons 
                    name="close" 
                    size={isTablet ? 24 : 20} 
                    color={currentStatus === 'absent' ? Colors.white : (isDisabled ? Colors.neutralBackground : Colors.text)} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  contentContainerTablet: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTablet: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
  },
  titleTablet: {
    fontSize: 48,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  subtitleTablet: {
    fontSize: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTablet: {
    padding: 32,
    borderRadius: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 8,
  },
  dateNavButtonDisabled: {
    opacity: 0.3,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: Colors.text,
    opacity: 0.6,
    marginTop: 4,
  },
  todayButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  todayButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  athleteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusButtonActive: {
    borderColor: Colors.white,
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
});
