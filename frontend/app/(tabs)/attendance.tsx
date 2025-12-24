import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Colors, baseStyles } from '../../constants/styles';

export default function AttendanceScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

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
          Track athlete attendance
        </Text>
      </View>
      
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <Text style={[baseStyles.text, styles.cardTitle]}>Today's Attendance</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: Colors.secondary }]}>
            <Text style={styles.statusText}>Present: 0</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: Colors.text }]}>
            <Text style={[styles.statusText, { color: Colors.white }]}>Absent: 0</Text>
          </View>
        </View>
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
});

