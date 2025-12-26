import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, baseStyles } from '../../constants/styles';
import { getAllAthletes, getAthleteName, getEffectiveRank, initializeAthletes } from '../../data/athletes';
import { Athlete } from '../../data/types';

interface SpreadsheetProps {
  workoutType?: 'workout' | 'longrun' | 'recovery';
  isTablet: boolean;
}

export default function Spreadsheet({ workoutType, isTablet }: SpreadsheetProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedRank, setSelectedRank] = useState<'rookie' | 'veteran' | 'varsity' | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);

  const loadAthletes = useCallback(async () => {
    await initializeAthletes();
    const allAthletes = getAllAthletes();
    // Debug: log first athlete's gender to verify it's loaded correctly
    if (allAthletes.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('Spreadsheet loaded athletes - First athlete:', allAthletes[0].firstName, 'gender:', allAthletes[0].gender);
    }
    setAthletes(allAthletes);
  }, []);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  const filteredAthletes = useMemo(() => {
    if (!athletes || athletes.length === 0) {
      return [];
    }
    
    // If no filters are selected, show all athletes (like attendance screen)
    if (!selectedRank && !selectedGender) {
      return athletes;
    }
    
    // When only gender filter is selected, show all athletes of that gender
    if (!selectedRank && selectedGender) {
      const filtered = athletes.filter(athlete => {
        const matches = athlete.gender === selectedGender;
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Athlete: ${getAthleteName(athlete)}, gender: ${athlete.gender}, selectedGender: ${selectedGender}, matches: ${matches}`);
        }
        return matches;
      });
      return filtered;
    }
    
    // When rank filter is selected (with or without gender), apply stricter filtering
    return athletes.filter(athlete => {
      // Exclude athletes with missing required fields when rank filter is active
      if (athlete.gender === null || athlete.gender === undefined) {
        return false;
      }
      
      if (athlete.goal1600m === null || athlete.goal1600m === undefined || (typeof athlete.goal1600m === 'string' && athlete.goal1600m.trim() === '')) {
        return false;
      }
      
      // Check if athlete has a valid rank for this workout type
      const rank = getEffectiveRank(athlete, workoutType);
      if (!rank) {
        return false;
      }
      
      // Filter by selected rank
      if (selectedRank) {
        if (rank !== selectedRank) {
          return false;
        }
      }
      
      // Filter by selected gender
      if (selectedGender) {
        if (athlete.gender !== selectedGender) {
          return false;
        }
      }
      
      return true;
    });
  }, [athletes, selectedRank, selectedGender, workoutType]);

  return (
    <View style={styles.spreadsheetContainer}>
      {/* Filters */}
      <View style={[styles.filtersContainer, isTablet && styles.filtersContainerTablet]}>
        <View style={styles.filterGroup}>
          <Text style={[baseStyles.text, styles.filterLabel]}>Rank:</Text>
          {(['rookie', 'veteran', 'varsity'] as const).map(rank => (
            <TouchableOpacity
              key={rank}
              onPress={() => setSelectedRank(selectedRank === rank ? null : rank)}
              style={[
                styles.filterButton,
                selectedRank === rank && styles.filterButtonActive,
                isTablet && styles.filterButtonTablet
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                selectedRank === rank && styles.filterButtonTextActive
              ]}>
                {rank.charAt(0).toUpperCase() + rank.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterGroup}>
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
      </View>

      {/* Table */}
      <View style={[styles.table, isTablet && styles.tableTablet]}>
        <View style={[styles.tableHeader, isTablet && styles.tableHeaderTablet]}>
          <Text style={[baseStyles.heading, styles.tableHeaderText, isTablet && styles.tableHeaderTextTablet]}>
            Times
          </Text>
        </View>
        {filteredAthletes.length === 0 ? (
          <View style={[styles.tableRow, isTablet && styles.tableRowTablet]}>
            <Text style={[baseStyles.text, styles.tableCell, isTablet && styles.tableCellTablet]}>
              No athletes found
            </Text>
          </View>
        ) : (
          filteredAthletes.map(athlete => (
            <View key={athlete.id} style={[styles.tableRow, isTablet && styles.tableRowTablet]}>
              <Text style={[baseStyles.text, styles.tableCell, isTablet && styles.tableCellTablet]}>
                {getAthleteName(athlete)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spreadsheetContainer: {
    marginTop: 24,
  },
  filtersContainer: {
    marginBottom: 16,
    gap: 12,
  },
  filtersContainerTablet: {
    marginBottom: 20,
    gap: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutralBackground,
  },
  filterButtonTablet: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  table: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutralBackground,
  },
  tableTablet: {
    borderRadius: 12,
  },
  tableHeader: {
    backgroundColor: Colors.primary,
    padding: 12,
  },
  tableHeaderTablet: {
    padding: 16,
  },
  tableHeaderText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: 'bold',
  },
  tableHeaderTextTablet: {
    fontSize: 18,
  },
  tableRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  tableRowTablet: {
    padding: 16,
  },
  tableCell: {
    fontSize: 14,
  },
  tableCellTablet: {
    fontSize: 16,
  },
});

