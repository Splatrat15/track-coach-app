import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, baseStyles } from '../../constants/styles';
import { getAllAthletes, getAthleteName, getEffectiveRank, initializeAthletes } from '../../data/athletes';
import { Athlete } from '../../data/types';

interface SpreadsheetProps {
  workoutType?: 'workout' | 'longrun' | 'recovery';
  isTablet: boolean;
}

/**
 * Parse time string in MM:SS format to total seconds
 * Example: "5:00" -> 300, "4:20" -> 260
 */
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseFloat(parts[1]) || 0;
  return minutes * 60 + seconds;
}

/**
 * Format seconds to MM:SS.S format (rounded to nearest 0.1 second)
 * Example: 105.5 -> "1:45.5", 49.3 -> "0:49.3"
 */
function formatTimeFromSeconds(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds * 10) / 10; // Round to nearest 0.1 second
  const minutes = Math.floor(rounded / 60);
  const seconds = (rounded % 60).toFixed(1);
  const secondsStr = seconds.padStart(4, '0'); // Ensures format like "49.5" or "05.0"
  return `${minutes}:${secondsStr}`;
}

/**
 * Calculate time for a distance at a given percentage of goal 1600m pace
 * @param goal1600m - Goal 1600m time in MM:SS format (e.g., "5:00")
 * @param distance - Distance in meters
 * @param percentage - Percentage of effort (e.g., 0.7 for 70%)
 * @returns Time in MM:SS.S format
 */
function calculateTime(goal1600m: string, distance: number, percentage: number): string {
  if (!goal1600m || goal1600m.trim() === '') return '--';
  
  const goalSeconds = parseTimeToSeconds(goal1600m);
  if (goalSeconds === 0) return '--';
  
  // Calculate pace per meter at goal pace
  const pacePerMeter = goalSeconds / 1600;
  
  // Apply percentage to get effort pace per meter
  const effortPacePerMeter = pacePerMeter * percentage;
  
  // Calculate time for the distance
  const timeInSeconds = effortPacePerMeter * distance;
  
  return formatTimeFromSeconds(timeInSeconds);
}

export default function Spreadsheet({ workoutType, isTablet }: SpreadsheetProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedRank, setSelectedRank] = useState<'rookie' | 'veteran' | 'varsity' | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  
  // Single ref for the main horizontal scroll
  const mainScrollRef = useRef<ScrollView>(null);

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
        <View style={[styles.filterGroup, isTablet && styles.filterGroupTablet]}>
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
      </View>

      {/* Table */}
      <View style={[styles.table, isTablet && styles.tableTablet]}>
        <View style={styles.tableContainer}>
          {/* Fixed Name Column Container */}
          <View style={styles.fixedNameColumn}>
            {/* Header: Name (spans both rows) */}
            <View style={styles.nameHeaderCell}>
              <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>Name</Text>
            </View>
            {/* Data Rows: Names */}
            {filteredAthletes.length === 0 ? (
              <View style={[styles.nameCell, isTablet && styles.nameCellTablet]}>
                <Text style={[baseStyles.text, styles.tableCell, isTablet && styles.tableCellTablet]}>
                  No athletes found
                </Text>
              </View>
            ) : (
              filteredAthletes.map((athlete, index) => (
                <View 
                  key={athlete.id}
                  style={[
                    styles.nameCell, 
                    isTablet && styles.nameCellTablet,
                    index === filteredAthletes.length - 1 && styles.lastNameCell
                  ]}
                >
                  <Text style={[baseStyles.text, styles.tableCell, styles.nameCellText, isTablet && styles.tableCellTablet]}>
                    {getAthleteName(athlete)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Scrollable Data Columns */}
          <ScrollView 
            ref={mainScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={true}
            style={styles.scrollableTable}
          >
            <View>
              {/* Header Row 1: Distances */}
              <View style={[styles.tableHeaderRow, isTablet && styles.tableHeaderRowTablet]}>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>800m</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>1000m</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>200m</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>1600m</Text>
                </View>
                {/* Second Set */}
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>800m</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>1000m</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>200m</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell, styles.lastHeaderCell]}>
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>1600m</Text>
                </View>
              </View>
              
              {/* Header Row 2: Percentages */}
              <View style={[styles.tableHeaderRow, styles.percentageHeaderRow, isTablet && styles.tableHeaderRowTablet]}>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>70%</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>80%</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>100%</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>100%</Text>
                </View>
                {/* Second Set */}
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>70%</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>80%</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell]}>
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>100%</Text>
                </View>
                <View style={[styles.headerCell, styles.dataHeaderCell, styles.lastHeaderCell]}>
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>100%</Text>
                </View>
              </View>

              {/* Data Rows */}
              {filteredAthletes.length === 0 ? null : (
                filteredAthletes.map((athlete, index) => {
                  const goal1600m = athlete.goal1600m || '';
                  return (
                    <View 
                      key={athlete.id} 
                      style={[
                        styles.tableRow, 
                        isTablet && styles.tableRowTablet,
                        index === filteredAthletes.length - 1 && styles.lastTableRow
                      ]}
                    >
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                          {calculateTime(goal1600m, 800, 0.7)}
                        </Text>
                      </View>
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                          {calculateTime(goal1600m, 1000, 0.8)}
                        </Text>
                      </View>
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                          {calculateTime(goal1600m, 200, 1.0)}
                        </Text>
                      </View>
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                          {calculateTime(goal1600m, 1600, 1.0)}
                        </Text>
                      </View>
                      {/* Second Set */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                          {calculateTime(goal1600m, 800, 0.7)}
                        </Text>
                      </View>
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                          {calculateTime(goal1600m, 1000, 0.8)}
                        </Text>
                      </View>
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                          {calculateTime(goal1600m, 200, 1.0)}
                        </Text>
                      </View>
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet, styles.lastDataCell]}>
                        <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                          {calculateTime(goal1600m, 1600, 1.0)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spreadsheetContainer: {
    marginTop: 8,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filtersContainerTablet: {
    marginBottom: 24,
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
  table: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.1)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  tableTablet: {
    borderRadius: 16,
  },
  tableContainer: {
    flexDirection: 'row',
  },
  fixedNameColumn: {
    width: 140,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: Colors.neutralBackground,
  },
  scrollableTable: {
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  tableHeaderRowTablet: {
    // Additional tablet styles if needed
  },
  percentageHeaderRow: {
    backgroundColor: 'rgba(30, 58, 95, 0.95)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    minWidth: 80,
    flexShrink: 0,
  },
  nameHeaderCell: {
    width: '100%',
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 12,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    height: 84, // Slightly reduced height
  },
  dataHeaderCell: {
    // Already set in headerCell
  },
  lastHeaderCell: {
    borderRightWidth: 0,
  },
  headerText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerTextTablet: {
    fontSize: 16,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0,
    minHeight: 56,
    alignItems: 'stretch',
    marginBottom: 4,
  },
  tableRowTablet: {
    minHeight: 64,
    marginBottom: 6,
  },
  lastTableRow: {
    marginBottom: 0,
  },
  nameCell: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
    justifyContent: 'center',
    height: 56,
    display: 'flex',
  },
  nameCellTablet: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    height: 64,
  },
  lastNameCell: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  dataCell: {
    width: 80,
    minWidth: 80,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.neutralBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    height: 56,
    display: 'flex',
  },
  dataCellTablet: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    height: 64,
  },
  lastDataCell: {
    borderRightWidth: 0,
  },
  tableCell: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  tableCellTablet: {
    fontSize: 16,
  },
  nameCellText: {
    fontWeight: '600',
  },
  timeCellText: {
    fontFamily: 'monospace',
    fontWeight: '500',
    textAlign: 'center',
  },
});

