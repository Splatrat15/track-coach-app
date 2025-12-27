import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

/**
 * Format time display for distances over 400m
 * Shows total time and 400m lap time on separate lines
 * @param goal1600m - Goal 1600m time in MM:SS format (e.g., "5:00")
 * @param distance - Distance in meters
 * @param percentage - Percentage of effort (e.g., 0.7 for 70%)
 * @returns Formatted string with total time and lap time, or just time if distance <= 400m
 */
function formatTimeDisplay(goal1600m: string, distance: number, percentage: number): string {
  const totalTime = calculateTime(goal1600m, distance, percentage);
  
  if (totalTime === '--') return '--';
  
  // If distance is over 400m, show total time and 400m lap time
  if (distance > 400) {
    const lapTime = calculateTime(goal1600m, 400, percentage);
    return `${totalTime} /\n${lapTime}`;
  }
  
  return totalTime;
}

/**
 * Calculate cooldown time for a column
 * Starts at 2:00 and adds 15 seconds for each column
 * @param columnIndex - Zero-based column index (0 = Strides, 1 = first 800m, etc.)
 * @returns Time in MM:SS format
 */
function calculateCooldownTime(columnIndex: number): string {
  const baseSeconds = 120; // 2:00 in seconds
  const additionalSeconds = columnIndex * 15;
  const totalSeconds = baseSeconds + additionalSeconds;
  return formatTimeFromSeconds(totalSeconds);
}

export default function Spreadsheet({ workoutType, isTablet }: SpreadsheetProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedRank, setSelectedRank] = useState<'rookie' | 'veteran' | 'varsity' | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  // Store actual times entered by coaches: key format is "rowIndex-columnIndex"
  const [actualTimes, setActualTimes] = useState<Record<string, string>>({});
  
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
    <View style={[
      styles.spreadsheetContainer,
      !isTablet && styles.spreadsheetContainerMobile
    ]}>
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
      <View style={styles.tableWrapper}>
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
            ) : (() => {
              // Create alternating rows: time, blank, time, blank... (2 rows per athlete)
              const totalRows = filteredAthletes.length * 2;
              const rows: (Athlete | null)[] = [];
              for (let i = 0; i < totalRows; i++) {
                if (i % 2 === 0) {
                  // Even indices: time rows (athletes)
                  const athleteIndex = i / 2;
                  rows.push(athleteIndex < filteredAthletes.length ? filteredAthletes[athleteIndex] : null);
                } else {
                  // Odd indices: blank rows
                  rows.push(null);
                }
              }
              
              return rows.map((rowData, index) => {
                const isBlank = rowData === null;
                const isLast = index === totalRows - 1;
                const isFirst = index === 0;
                
                return (
                  <View 
                    key={`name-row-${index}`}
                    style={[
                      styles.nameRowWrapper,
                      isTablet && styles.nameRowWrapperTablet,
                      isFirst && styles.firstNameRowWrapper,
                      isLast && [
                        styles.lastNameRowWrapper,
                        isTablet && styles.lastNameRowWrapperTablet
                      ],
                      !isBlank && styles.timeRowBackground
                    ]}
                  >
                    <View style={[
                      styles.nameCell, 
                      isTablet && styles.nameCellTablet,
                      isLast && styles.lastNameCell
                    ]}>
                      <View style={[
                        styles.nameRowDivider,
                        isLast && styles.lastRowDivider
                      ]} />
                      <View style={styles.nameColumnDivider} />
                      {!isBlank && rowData && (
                        <View style={styles.nameTextContainer}>
                          <Text style={[baseStyles.text, styles.tableCell, styles.nameCellText, styles.firstNameText, isTablet && styles.tableCellTablet]}>
                            {rowData.firstName}
                          </Text>
                          <Text style={[baseStyles.text, styles.tableCell, styles.nameCellText, styles.lastNameText, isTablet && styles.tableCellTablet]}>
                            {rowData.lastName}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              }).concat(
                // Cooldown row
                <View 
                  key="cooldown-name-row"
                  style={[
                    styles.nameRowWrapper,
                    isTablet && styles.nameRowWrapperTablet,
                    styles.cooldownRowBackground
                  ]}
                >
                  <View style={[
                    styles.nameCell, 
                    isTablet && styles.nameCellTablet
                  ]}>
                    <View style={styles.nameRowDivider} />
                    <View style={styles.nameColumnDivider} />
                    <View style={styles.nameTextContainer}>
                      <Text style={[baseStyles.text, styles.tableCell, styles.nameCellText, isTablet && styles.tableCellTablet]}>
                        Cooldown
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })()}
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
                  <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>Strides</Text>
                </View>
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
                  <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>4</Text>
                </View>
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
              {filteredAthletes.length === 0 ? null : (() => {
                // Create alternating rows: time, blank, time, blank... (2 rows per athlete)
                const totalRows = filteredAthletes.length * 2;
                const rows: (Athlete | null)[] = [];
                for (let i = 0; i < totalRows; i++) {
                  if (i % 2 === 0) {
                    // Even indices: time rows (athletes)
                    const athleteIndex = i / 2;
                    rows.push(athleteIndex < filteredAthletes.length ? filteredAthletes[athleteIndex] : null);
                  } else {
                    // Odd indices: blank rows
                    rows.push(null);
                  }
                }
                
                return rows.map((rowData, index) => {
                  const isBlank = rowData === null;
                  const isLast = index === totalRows - 1;
                  const isFirst = index === 0;
                  const goal1600m = rowData?.goal1600m || '';
                  
                  // Helper function to get input key for a cell
                  const getInputKey = (colIndex: number) => `${index}-${colIndex}`;
                  
                  return (
                    <View 
                      key={`data-row-${index}`} 
                      style={[
                        styles.tableRow, 
                        isTablet && styles.tableRowTablet,
                        isFirst && styles.firstTableRow,
                        isLast && [styles.lastTableRow, isTablet && styles.lastTableRowTablet],
                        !isBlank && styles.timeRowBackground
                      ]}
                    >
                      <View style={[
                        styles.rowDivider,
                        isLast && styles.lastRowDivider
                      ]} />
                      {/* Strides column */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <View style={styles.columnDivider} />
                        {isBlank && (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(0)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(0)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                      {/* 800m 70% */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <View style={styles.columnDivider} />
                        {!isBlank ? (
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {formatTimeDisplay(goal1600m, 800, 0.7)}
                          </Text>
                        ) : (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(1)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(1)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                      {/* 1000m 80% */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <View style={styles.columnDivider} />
                        {!isBlank ? (
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {formatTimeDisplay(goal1600m, 1000, 0.8)}
                          </Text>
                        ) : (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(2)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(2)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                      {/* 200m 100% */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <View style={styles.columnDivider} />
                        {!isBlank ? (
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {calculateTime(goal1600m, 200, 1.0)}
                          </Text>
                        ) : (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(3)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(3)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                      {/* 1600m 100% */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <View style={styles.columnDivider} />
                        {!isBlank ? (
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {formatTimeDisplay(goal1600m, 1600, 1.0)}
                          </Text>
                        ) : (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(4)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(4)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                      {/* Second Set - 800m 70% */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <View style={styles.columnDivider} />
                        {!isBlank ? (
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {formatTimeDisplay(goal1600m, 800, 0.7)}
                          </Text>
                        ) : (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(5)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(5)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                      {/* Second Set - 1000m 80% */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <View style={styles.columnDivider} />
                        {!isBlank ? (
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {formatTimeDisplay(goal1600m, 1000, 0.8)}
                          </Text>
                        ) : (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(6)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(6)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                      {/* Second Set - 200m 100% */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                        <View style={styles.columnDivider} />
                        {!isBlank ? (
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {calculateTime(goal1600m, 200, 1.0)}
                          </Text>
                        ) : (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(7)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(7)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                      {/* Second Set - 1600m 100% */}
                      <View style={[styles.dataCell, isTablet && styles.dataCellTablet, styles.lastDataCell]}>
                        {!isBlank ? (
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {formatTimeDisplay(goal1600m, 1600, 1.0)}
                          </Text>
                        ) : (
                          <TextInput
                            style={[styles.tableCell, styles.timeCellText, styles.inputCell, isTablet && styles.tableCellTablet]}
                            value={actualTimes[getInputKey(8)] || ''}
                            onChangeText={(text) => setActualTimes(prev => ({ ...prev, [getInputKey(8)]: text }))}
                            placeholder=""
                            keyboardType="default"
                          />
                        )}
                      </View>
                    </View>
                  );
                }).concat(
                  // Cooldown row
                  <View 
                    key="cooldown-data-row"
                    style={[
                      styles.tableRow,
                      isTablet && styles.tableRowTablet,
                      styles.cooldownRowBackground
                    ]}
                  >
                    <View style={styles.rowDivider} />
                    {/* Strides column */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                      <View style={styles.columnDivider} />
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(0)}
                      </Text>
                    </View>
                    {/* 800m 70% */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                      <View style={styles.columnDivider} />
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(1)}
                      </Text>
                    </View>
                    {/* 1000m 80% */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                      <View style={styles.columnDivider} />
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(2)}
                      </Text>
                    </View>
                    {/* 200m 100% */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                      <View style={styles.columnDivider} />
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(3)}
                      </Text>
                    </View>
                    {/* 1600m 100% */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                      <View style={styles.columnDivider} />
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(4)}
                      </Text>
                    </View>
                    {/* Second Set - 800m 70% */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                      <View style={styles.columnDivider} />
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(5)}
                      </Text>
                    </View>
                    {/* Second Set - 1000m 80% */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                      <View style={styles.columnDivider} />
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(6)}
                      </Text>
                    </View>
                    {/* Second Set - 200m 100% */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet]}>
                      <View style={styles.columnDivider} />
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(7)}
                      </Text>
                    </View>
                    {/* Second Set - 1600m 100% */}
                    <View style={[styles.dataCell, isTablet && styles.dataCellTablet, styles.lastDataCell]}>
                      <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                        {calculateCooldownTime(8)}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spreadsheetContainer: {
    marginTop: 8,
    marginHorizontal: 0, // Remove horizontal margins on mobile to stretch edge-to-edge
    paddingHorizontal: 0,
  },
  spreadsheetContainerMobile: {
    marginLeft: -16, // Break out of parent padding (16px from workout.tsx container)
    marginRight: -16, // Break out of parent padding
    width: '100%', // Ensure full width
    maxWidth: '100%', // Override any max-width constraints
  },
  spreadsheetContainerTablet: {
    marginHorizontal: 20, // Keep margins on tablet
  },
  tableWrapper: {
    // Wrapper for the table to ensure it breaks out of parent padding on mobile
    marginLeft: 0,
    marginRight: 0,
    width: '100%',
    overflow: 'visible',
  },
  filtersContainer: {
    marginBottom: 20,
    paddingHorizontal: 16, // Add padding back for filters on mobile (they should stay within bounds)
  },
  filtersContainerTablet: {
    marginBottom: 24,
    paddingHorizontal: 0, // No extra padding on tablet
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
    borderTopLeftRadius: 0, // No radius on left edge for mobile
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 0, // No radius on left edge for mobile
    borderBottomRightRadius: 14,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.1)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginHorizontal: 0, // Remove horizontal margins on mobile
    marginLeft: 0, // Ensure it touches left edge
    paddingLeft: 0, // No left padding
  },
  tableTablet: {
    borderRadius: 16,
    marginHorizontal: 20, // Keep margins on tablet
  },
  tableContainer: {
    flexDirection: 'row',
    overflow: 'visible',
    marginLeft: 0, // Ensure container touches left edge
    paddingLeft: 0, // No left padding
  },
  fixedNameColumn: {
    width: 140,
    flexShrink: 0,
    borderRightWidth: 0,
    position: 'relative',
    zIndex: 10,
    backgroundColor: Colors.white,
    overflow: 'visible',
    marginLeft: 0, // Ensure it touches left edge
    paddingLeft: 0, // No left padding
  },
  scrollableTable: {
    flex: 1,
    overflow: 'visible',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    height: 44, // Fixed height for consistent alignment
  },
  tableHeaderRowTablet: {
    height: 44, // Fixed height for consistent alignment
  },
  percentageHeaderRow: {
    backgroundColor: 'rgba(30, 58, 95, 0.95)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    height: 44, // Fixed height for consistent alignment
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
    alignSelf: 'stretch', // Fill parent row height
  },
  nameHeaderCell: {
    width: '100%',
    alignItems: 'flex-start',
    paddingLeft: 4, // Minimal left padding to touch edge
    paddingRight: 8,
    paddingVertical: 12,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    height: 88, // Match sum of two header rows (44 + 44)
    minHeight: 88,
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
    height: 80, // Match cell height exactly
    alignItems: 'stretch',
    marginBottom: 0,
    marginTop: 0,
    position: 'relative',
    overflow: 'visible',
  },
  tableRowTablet: {
    height: 90, // Match cell height exactly
    marginBottom: 0,
    marginTop: 0,
    overflow: 'visible',
  },
  firstTableRow: {
    marginTop: 0,
  },
  lastTableRow: {
    marginBottom: 0,
    height: 80, // Match cell height exactly
  },
  lastTableRowTablet: {
    height: 90, // Match cell height exactly
  },
  nameRowWrapper: {
    marginBottom: 0,
    marginTop: 0,
    position: 'relative',
    overflow: 'visible',
    height: 80, // Match tableRow height exactly
  },
  nameRowWrapperTablet: {
    height: 90, // Match tableRowTablet height exactly
    marginBottom: 0,
  },
  firstNameRowWrapper: {
    marginTop: 0,
  },
  lastNameRowWrapper: {
    marginBottom: 0,
    height: 80, // Match lastTableRow height
  },
  lastNameRowWrapperTablet: {
    height: 90, // Match lastTableRowTablet height
  },
  nameCell: {
    paddingVertical: 12,
    paddingLeft: 4, // Minimal left padding to touch edge
    paddingRight: 8,
    borderBottomWidth: 0,
    justifyContent: 'center',
    height: 80,
    display: 'flex',
    position: 'relative',
    flex: 1,
  },
  nameColumnDivider: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#9CA3AF', // Much darker and clearer
    zIndex: 2,
  },
  nameCellTablet: {
    paddingVertical: 14,
    paddingLeft: 4, // Minimal left padding to touch edge (on mobile, tablet keeps margin from table)
    paddingRight: 12,
    height: 90,
  },
  lastNameCell: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  dataCell: {
    width: 80,
    minWidth: 80,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    height: 80,
    display: 'flex',
    position: 'relative',
  },
  columnDivider: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#9CA3AF', // Much darker and clearer
    zIndex: 1,
  },
  rowDivider: {
    position: 'absolute',
    left: -140, // Extend into name column area (140px is name column width)
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: '#9CA3AF', // Much darker and clearer
    zIndex: 1,
  },
  nameRowDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: '#9CA3AF', // Much darker and clearer
    zIndex: 1,
  },
  lastRowDivider: {
    display: 'none', // Hide divider on last row
  },
  dataCellTablet: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    height: 90,
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
  nameTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  firstNameText: {
    marginBottom: 4,
  },
  lastNameText: {
    opacity: 0.8,
  },
  timeCellText: {
    fontFamily: 'monospace',
    fontWeight: '500',
    textAlign: 'center',
  },
  inputCell: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    textAlign: 'center',
    color: Colors.text,
    width: '100%',
    minHeight: 20,
  },
  timeRowBackground: {
    backgroundColor: 'rgba(30, 58, 95, 0.04)', // Light blue-gray background for time rows
  },
  cooldownRowBackground: {
    backgroundColor: 'rgba(30, 58, 95, 0.12)', // Blueish background for cooldown row
  },
});

