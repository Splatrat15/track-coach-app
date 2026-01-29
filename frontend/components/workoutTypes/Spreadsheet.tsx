import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { baseStyles } from '../../constants/styles';
import { ThemeColors } from '../../constants/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { getAllAthletes, getEffectiveRank, initializeAthletes } from '../../data/athletes';
import { Athlete } from '../../data/types';

interface SpreadsheetProps {
  workoutType?: 'workout' | 'longrun' | 'recovery';
  isTablet: boolean;
  isEditMode?: boolean;
  /** When this changes, athlete list is reloaded (e.g. after add/remove on another tab). */
  athleteRefreshTrigger?: number;
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

/**
 * Generate dropdown options from -30 to +30
 * Returns array of objects with value and label
 */
function generateTimeDifferenceOptions(): Array<{ value: number; label: string }> {
  const options: Array<{ value: number; label: string }> = [];
  for (let i = -30; i <= 30; i++) {
    options.push({
      value: i,
      label: i === 0 ? '0' : i > 0 ? `+${i}` : `${i}`
    });
  }
  return options;
}

const TIME_DIFFERENCE_OPTIONS = generateTimeDifferenceOptions();

/**
 * Workout segment definition
 */
interface WorkoutSegment {
  distance: number; // in meters
  percentage: number; // percentage of goal pace (e.g., 0.8 for 80%)
}

/**
 * Extended column definition for editable columns
 */
interface WorkoutColumn {
  distance?: number; // in meters (optional)
  percentage?: number; // percentage of goal pace (e.g., 0.8 for 80%) (optional)
  reps?: number; // number of reps (optional)
  time?: number; // time in seconds (optional)
  recordTime?: boolean; // whether to record time for this column
  name?: string; // custom name for the column (optional)
  label: string; // display label
  isCustom?: boolean; // whether this is a custom/editable column
  id?: string; // unique ID for custom columns
  repNumber?: number; // which rep number this is (for multi-rep columns with recordTime)
  isMultiRepNoTime?: boolean; // if true, this is a multi-rep column where reps/percentage shown in data area
  recoveryTime?: string; // recovery time in MM:SS format (required for custom columns)
  rank?: 'rookie' | 'veteran' | 'varsity'; // which rank this column belongs to
}

/**
 * Workout configuration for a rank
 */
interface RankWorkoutConfig {
  segments: WorkoutSegment[]; // The segments to repeat (e.g., [1000m 80%, 800m 100%])
  repeats: number; // Number of times to repeat the segments
}

/**
 * Get workout configuration for a rank
 */
function getWorkoutConfig(rank: 'rookie' | 'veteran' | 'varsity'): RankWorkoutConfig {
  switch (rank) {
    case 'varsity':
      // Varsity: 1000m at 80%, then 800m at 100%, repeat 3 times
      return {
        segments: [
          { distance: 1000, percentage: 0.8 },
          { distance: 800, percentage: 1.0 }
        ],
        repeats: 3
      };
    case 'veteran':
      // Veterans: 800m at 75%, then 1200m at 60%, repeat 2 times
      return {
        segments: [
          { distance: 800, percentage: 0.75 },
          { distance: 1200, percentage: 0.6 }
        ],
        repeats: 2
      };
    case 'rookie':
      // Rookies: 400m at 90%, then 800m at 50%, repeat 4 times
      return {
        segments: [
          { distance: 400, percentage: 0.9 },
          { distance: 800, percentage: 0.5 }
        ],
        repeats: 4
      };
    default:
      // Fallback (shouldn't happen)
      return {
        segments: [
          { distance: 800, percentage: 0.7 },
          { distance: 1000, percentage: 0.8 }
        ],
        repeats: 2
      };
  }
}

/**
 * Generate all columns for a workout (including strides and all repeats)
 */
function generateWorkoutColumns(rank: 'rookie' | 'veteran' | 'varsity'): WorkoutColumn[] {
  const config = getWorkoutConfig(rank);
  const columns: WorkoutColumn[] = [];
  
  // All workouts start with 4 strides
  columns.push({ distance: 0, percentage: 0, label: 'Strides', isCustom: false });
  
  // Add all repeats of segments
  for (let repeat = 0; repeat < config.repeats; repeat++) {
    config.segments.forEach(segment => {
      columns.push({
        distance: segment.distance,
        percentage: segment.percentage,
        label: `${segment.distance}m`,
        isCustom: false
      });
    });
  }
  
  return columns;
}

export default function Spreadsheet({ workoutType, isTablet, isEditMode = false, athleteRefreshTrigger }: SpreadsheetProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedRank, setSelectedRank] = useState<'rookie' | 'veteran' | 'varsity' | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  // Store time differences for dropdown cells: key format is "rowIndex-columnIndex", value is number (-30 to +30) or null if not set
  const [timeDifferences, setTimeDifferences] = useState<Record<string, number | null>>({});
  // Track which dropdown is currently open: key format is "rowIndex-columnIndex"
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Custom columns added by the user (editable columns) - organized by rank
  const [customColumns, setCustomColumns] = useState<{
    rookie: WorkoutColumn[];
    veteran: WorkoutColumn[];
    varsity: WorkoutColumn[];
  }>({
    rookie: [],
    veteran: [],
    varsity: [],
  });
  // Modal state for adding/editing columns
  const [addColumnModalVisible, setAddColumnModalVisible] = useState(false);
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [editingColumnRank, setEditingColumnRank] = useState<'rookie' | 'veteran' | 'varsity' | null>(null);
  // Form state for new column
  const [newColumnReps, setNewColumnReps] = useState<string>('');
  const [newColumnTime, setNewColumnTime] = useState<string>('');
  const [newColumnPercentage, setNewColumnPercentage] = useState<string>('');
  const [newColumnRecordTime, setNewColumnRecordTime] = useState<boolean>(false);
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [newColumnDistance, setNewColumnDistance] = useState<string>('');
  const [newColumnRecoveryTime, setNewColumnRecoveryTime] = useState<string>('');
  // Selected ranks for adding column (multi-select)
  const [selectedRanksForColumn, setSelectedRanksForColumn] = useState<{
    rookie: boolean;
    veteran: boolean;
    varsity: boolean;
  }>({
    rookie: false,
    veteran: false,
    varsity: false,
  });
  
  // Drag and drop state
  const [draggingAthleteId, setDraggingAthleteId] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const dragPosition = useRef(0);
  
  // Single ref for the main horizontal scroll
  const mainScrollRef = useRef<ScrollView>(null);
  // Ref for the dropdown scroll view
  const dropdownScrollRef = useRef<ScrollView>(null);
  
  // Refs for drag state to access in PanResponder
  const draggingAthleteIdRef = useRef(draggingAthleteId);
  const draggingIndexRef = useRef(draggingIndex);
  const isTabletRef = useRef(isTablet);
  
  // Update refs when state changes
  useEffect(() => {
    draggingAthleteIdRef.current = draggingAthleteId;
    draggingIndexRef.current = draggingIndex;
    isTabletRef.current = isTablet;
  }, [draggingAthleteId, draggingIndex, isTablet]);

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

  // Reload athletes when parent signals refresh (e.g. after add/remove on Attendance tab)
  useEffect(() => {
    if (athleteRefreshTrigger !== undefined && athleteRefreshTrigger > 0) {
      loadAthletes();
    }
  }, [athleteRefreshTrigger, loadAthletes]);

  // Auto-scroll dropdown to center (0 option) when it opens
  useEffect(() => {
    if (openDropdown !== null && dropdownScrollRef.current) {
      // Calculate scroll position to center the 0 option
      // Each option is approximately 54px tall (14px padding + 14px padding + 16px text + 8px margin)
      // We want to scroll so that option 30 (index 30) is at the top, showing 0 in the middle
      // Actually, let's scroll to show 0 in the middle of the visible area
      // With maxHeight 400, we can show about 7-8 options, so we want 0 to be in the middle
      // Option 0 is at index 30 (since we go from -30 to +30)
      const optionHeight = 54; // Approximate height per option
      const visibleHeight = 400; // maxHeight of scroll view
      const centerOffset = visibleHeight / 2;
      const scrollToPosition = (30 * optionHeight) - centerOffset; // 30 is the index of 0
      
      setTimeout(() => {
        dropdownScrollRef.current?.scrollTo({
          y: Math.max(0, scrollToPosition),
          animated: false,
        });
      }, 100);
    }
  }, [openDropdown]);
  
  // Handle long press to start dragging
  const handleAthleteLongPress = (athleteId: string, index: number) => {
    if (!isEditMode) return;
    setDraggingAthleteId(athleteId);
    setDraggingIndex(index);
    dragY.setValue(0);
    dragPosition.current = 0;
  };
  
  // Pan responder for drag and drop
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !!draggingAthleteIdRef.current,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return !!draggingAthleteIdRef.current && Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: (evt) => {
        if (draggingAthleteIdRef.current) {
          dragY.setOffset(0);
          dragY.setValue(0);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Just update the visual position - NO reordering during drag
        dragY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const athleteId = draggingAthleteIdRef.current;
        const currentIndex = draggingIndexRef.current;
        
        if (athleteId && currentIndex !== null) {
          // Calculate target index based on drag distance
          // Each row is 80px tall (or 90px on tablet), but we have 2 rows per athlete (time + blank)
          // So each athlete takes 160px (or 180px on tablet)
          const rowHeight = isTabletRef.current ? 90 : 80;
          const athleteHeight = rowHeight * 2; // 2 rows per athlete
          const itemsMoved = Math.round(gestureState.dy / athleteHeight);
          const targetIndex = Math.max(0, Math.min(displayAthletes.length - 1, currentIndex + itemsMoved));
          
          // Only reorder if position actually changed
          if (targetIndex !== currentIndex && targetIndex >= 0 && targetIndex < displayAthletes.length) {
            // Reorder the athletes array
            const newOrder = [...displayAthletes];
            const [movedAthlete] = newOrder.splice(currentIndex, 1);
            newOrder.splice(targetIndex, 0, movedAthlete);
            setFilteredAthletesOrder(newOrder);
          }
          
          // Animate to final position (0) smoothly
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 30,
          }).start(() => {
            dragY.flattenOffset();
            dragPosition.current = 0;
            setDraggingAthleteId(null);
            setDraggingIndex(null);
            dragY.setValue(0);
          });
        } else {
          // Reset if something went wrong
          dragY.setValue(0);
          setDraggingAthleteId(null);
          setDraggingIndex(null);
        }
      },
      onPanResponderTerminate: () => {
        if (draggingAthleteIdRef.current) {
          // Animate back to original position
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 30,
          }).start(() => {
            dragY.flattenOffset();
            dragPosition.current = 0;
          });
          
          setDraggingAthleteId(null);
          setDraggingIndex(null);
          dragY.setValue(0);
        }
      },
    });
  }, []); // Empty deps - use refs for state

  // Use only custom columns for the selected rank (no default/fixed columns)
  const workoutColumns = useMemo(() => {
    if (!selectedRank) return [];
    return customColumns[selectedRank] || [];
  }, [customColumns, selectedRank]);

  // Generate label for a column based on its properties
  const generateColumnLabel = useCallback((column: Partial<WorkoutColumn>): string => {
    if (column.name) {
      return column.name;
    }
    if (column.distance) {
      return `${column.distance}m`;
    }
    if (column.reps !== undefined) {
      return `${column.reps} reps`;
    }
    if (column.time !== undefined) {
      const minutes = Math.floor(column.time / 60);
      const seconds = column.time % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return 'Column';
  }, []);

  // Reset form when modal closes
  const resetColumnForm = () => {
    setNewColumnReps('');
    setNewColumnTime('');
    setNewColumnPercentage('');
    setNewColumnRecordTime(false);
    setNewColumnName('');
    setNewColumnDistance('');
    setNewColumnRecoveryTime('');
    setEditingColumnIndex(null);
    setEditingColumnRank(null);
    setSelectedRanksForColumn({
      rookie: false,
      veteran: false,
      varsity: false,
    });
  };

  // Helper function to validate MM:SS format
  const validateRecoveryTime = (timeStr: string): boolean => {
    const parts = timeStr.trim().split(':');
    if (parts.length !== 2) return false;
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) return false;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return false;
    return true;
  };

  // Handle adding a new column
  const handleAddColumn = () => {
    // Validation: if no name and no distance, require name
    if (!newColumnName.trim() && !newColumnDistance.trim()) {
      Alert.alert('Validation Error', 'Please provide either a name or distance for the column.');
      return;
    }

    // Validation: recovery time is required
    if (!newColumnRecoveryTime.trim()) {
      Alert.alert('Validation Error', 'Recovery time is required. Please enter time in MM:SS format (e.g., 2:00).');
      return;
    }

    // Validation: recovery time format
    if (!validateRecoveryTime(newColumnRecoveryTime)) {
      Alert.alert('Validation Error', 'Invalid recovery time format. Please use MM:SS format (e.g., 2:00 or 2:15).');
      return;
    }

    // Validation: at least one rank must be selected
    if (editingColumnIndex === null) {
      const hasSelectedRank = selectedRanksForColumn.rookie || selectedRanksForColumn.veteran || selectedRanksForColumn.varsity;
      if (!hasSelectedRank) {
        Alert.alert('Validation Error', 'Please select at least one rank (Rookie, Veteran, or Varsity).');
        return;
      }
    }

    const baseColumnData: Partial<WorkoutColumn> = {
      name: newColumnName.trim() || undefined,
      distance: newColumnDistance.trim() ? parseInt(newColumnDistance, 10) : undefined,
      reps: newColumnReps.trim() ? parseInt(newColumnReps, 10) : undefined,
      time: newColumnTime.trim() ? parseInt(newColumnTime, 10) : undefined,
      percentage: newColumnPercentage.trim() ? parseFloat(newColumnPercentage) / 100 : undefined,
      recordTime: newColumnRecordTime,
      recoveryTime: newColumnRecoveryTime.trim(),
    };

    const repsValue = newColumnReps.trim() ? parseInt(newColumnReps, 10) : undefined;
    const hasMultipleReps = repsValue !== undefined && repsValue > 1;

    const createColumnObjects = (): WorkoutColumn[] => {
      const columns: WorkoutColumn[] = [];
      
      if (hasMultipleReps && newColumnRecordTime) {
        // Create multiple columns (one per rep)
        for (let rep = 1; rep <= repsValue; rep++) {
          const repColumn: WorkoutColumn = {
            ...baseColumnData,
            label: baseColumnData.name || baseColumnData.distance ? 
              (baseColumnData.name || `${baseColumnData.distance}m`) :
              `Rep ${rep}`,
            repNumber: rep,
            isCustom: true,
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${rep}`,
          };
          columns.push(repColumn);
        }
      } else {
        // Single column
        const singleColumn: WorkoutColumn = {
          ...baseColumnData,
          label: generateColumnLabel(baseColumnData),
          isMultiRepNoTime: hasMultipleReps && !newColumnRecordTime,
          isCustom: true,
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        columns.push(singleColumn);
      }
      
      return columns;
    };

    if (editingColumnIndex !== null && editingColumnRank) {
      // Editing existing column - replace it (or all reps if it was multi-rep)
      const rankColumns = customColumns[editingColumnRank];
      const existingColumn = rankColumns[editingColumnIndex];
      const isEditingMultiRep = existingColumn.repNumber !== undefined;
      
      // If editing a multi-rep column, remove all related reps
      let columnsToKeep = rankColumns;
      if (isEditingMultiRep) {
        const baseId = existingColumn.id?.replace(/_\d+$/, '') || existingColumn.id;
        columnsToKeep = rankColumns.filter(col => {
          const colBaseId = col.id?.replace(/_\d+$/, '') || col.id;
          return colBaseId !== baseId;
        });
      } else {
        // Remove just this column
        columnsToKeep = rankColumns.filter((_, idx) => idx !== editingColumnIndex);
      }

      // Create new columns with the same rank
      const newColumns = createColumnObjects().map(col => ({
        ...col,
        rank: editingColumnRank,
      }));

      setCustomColumns({
        ...customColumns,
        [editingColumnRank]: [...columnsToKeep, ...newColumns],
      });
    } else {
      // Adding new column - add to end of each selected rank's columns
      const newColumns = createColumnObjects();
      const updatedColumns = { ...customColumns };

      (['rookie', 'veteran', 'varsity'] as const).forEach(rank => {
        if (selectedRanksForColumn[rank]) {
          updatedColumns[rank] = [
            ...updatedColumns[rank],
            ...newColumns.map(col => ({
              ...col,
              rank,
            })),
          ];
        }
      });

      setCustomColumns(updatedColumns);
    }

    setAddColumnModalVisible(false);
    resetColumnForm();
  };

  // Handle deleting a custom column (and all related reps if it's a multi-rep column)
  const handleDeleteColumn = (columnId: string) => {
    if (!selectedRank) return;
    const rankColumns = customColumns[selectedRank];
    const column = rankColumns.find(c => c.id === columnId);
    if (!column) return;

    Alert.alert(
      'Delete Column',
      column.repNumber !== undefined 
        ? 'Are you sure you want to delete all reps for this column?'
        : 'Are you sure you want to delete this column?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (!selectedRank) return;
            const rankColumns = customColumns[selectedRank];
            if (column.repNumber !== undefined) {
              // Delete all reps (find base ID)
              const baseId = columnId.replace(/_\d+$/, '');
              const updatedColumns = rankColumns.filter(col => {
                const colId = col.id?.replace(/_\d+$/, '') || col.id;
                return colId !== baseId;
              });
              setCustomColumns({
                ...customColumns,
                [selectedRank]: updatedColumns,
              });
            } else {
              // Delete single column
              const updatedColumns = rankColumns.filter(col => col.id !== columnId);
              setCustomColumns({
                ...customColumns,
                [selectedRank]: updatedColumns,
              });
            }
          },
        },
      ]
    );
  };

  // Handle editing a custom column
  const handleEditColumn = (column: WorkoutColumn, index: number) => {
    if (!selectedRank) return;
    const rankColumns = customColumns[selectedRank];
    
    // If editing a multi-rep column with repNumber, find the base column (first rep)
    let baseColumn = column;
    let actualIndex = index;
    if (column.repNumber !== undefined && column.repNumber > 1) {
      const baseId = column.id?.replace(/_\d+$/, '');
      const firstRep = rankColumns.find(col => {
        const colId = col.id?.replace(/_\d+$/, '');
        return colId === baseId && col.repNumber === 1;
      });
      if (firstRep) {
        baseColumn = firstRep;
        // Find the index of the first rep for editing
        const firstRepIndex = rankColumns.findIndex(col => col.id === firstRep.id);
        if (firstRepIndex !== -1) {
          actualIndex = firstRepIndex;
        }
      }
    }

    setNewColumnReps(baseColumn.reps?.toString() || '');
    setNewColumnTime(baseColumn.time?.toString() || '');
    setNewColumnPercentage(baseColumn.percentage ? (baseColumn.percentage * 100).toString() : '');
    setNewColumnRecordTime(baseColumn.recordTime || false);
    setNewColumnName(baseColumn.name || '');
    setNewColumnDistance(baseColumn.distance?.toString() || '');
    setNewColumnRecoveryTime(baseColumn.recoveryTime || '');
    setEditingColumnIndex(actualIndex);
    setEditingColumnRank(selectedRank);
    setAddColumnModalVisible(true);
  };

  const [filteredAthletesOrder, setFilteredAthletesOrder] = useState<Athlete[]>([]);
  
  const filteredAthletes = useMemo(() => {
    if (!athletes || athletes.length === 0) {
      return [];
    }
    
    // REQUIRE rank filter - if no rank is selected, show nothing
    if (!selectedRank) {
      return [];
    }
    
    // When rank filter is selected (with or without gender), apply stricter filtering
    const filtered = athletes.filter(athlete => {
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
      if (rank !== selectedRank) {
        return false;
      }
      
      // Filter by selected gender
      if (selectedGender) {
        if (athlete.gender !== selectedGender) {
          return false;
        }
      }
      
      return true;
    });
    
    return filtered;
  }, [athletes, selectedRank, selectedGender, workoutType]);
  
  // Update filteredAthletesOrder when filteredAthletes changes
  useEffect(() => {
    setFilteredAthletesOrder(filteredAthletes);
  }, [filteredAthletes]);
  
  // Use filteredAthletesOrder for display to preserve drag order
  const displayAthletes = filteredAthletesOrder;

  return (
    <View style={[
      styles.spreadsheetContainer,
      !isTablet && styles.spreadsheetContainerMobile,
      { backgroundColor: colors.neutralBackground }
    ]}>
      {/* Filters */}
      <View style={[styles.filtersContainer, isTablet && styles.filtersContainerTablet]}>
        <View style={[styles.filterGroup, isTablet && styles.filterGroupTablet]}>
          <Text style={[styles.filterLabel, { color: colors.text }]}>Rank:</Text>
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
          <Text style={[styles.filterLabel, { color: colors.text }]}>Gender:</Text>
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
      {!selectedRank ? (
        <View style={[styles.tableWrapper, styles.emptyStateContainer]}>
          <View style={[styles.table, isTablet && styles.tableTablet, styles.emptyStateTable]}>
            <Text style={[styles.emptyStateText, isTablet && styles.emptyStateTextTablet, { color: colors.text }]}>
              Please select a rank to view the workout spreadsheet
            </Text>
          </View>
        </View>
      ) : (
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
              {displayAthletes.length === 0 ? (
                <View style={[styles.nameCell, isTablet && styles.nameCellTablet]}>
                  <Text style={[baseStyles.text, styles.tableCell, isTablet && styles.tableCellTablet]}>
                    No athletes found
                  </Text>
                </View>
              ) : (() => {
              // Create alternating rows: time, blank, time, blank... (2 rows per athlete)
              const totalRows = displayAthletes.length * 2;
              const rows: (Athlete | null)[] = [];
              for (let i = 0; i < totalRows; i++) {
                if (i % 2 === 0) {
                  // Even indices: time rows (athletes)
                  const athleteIndex = i / 2;
                  rows.push(athleteIndex < displayAthletes.length ? displayAthletes[athleteIndex] : null);
                } else {
                  // Odd indices: blank rows
                  rows.push(null);
                }
              }
              
              return rows.map((rowData, index) => {
                const isBlank = rowData === null;
                const isLast = index === totalRows - 1;
                const isFirst = index === 0;
                const athleteIndex = Math.floor(index / 2);
                const isDragging = draggingAthleteId === rowData?.id;
                const animatedStyle = isDragging ? {
                  transform: [{ translateY: dragY }],
                  zIndex: 1000,
                  elevation: 10,
                } : {};
                
                return (
                  <Animated.View 
                    key={`name-row-${rowData?.id || index}-${index}`}
                    style={[
                      styles.nameRowWrapper,
                      isTablet && styles.nameRowWrapperTablet,
                      isFirst && styles.firstNameRowWrapper,
                      isLast && [
                        styles.lastNameRowWrapper,
                        isTablet && styles.lastNameRowWrapperTablet
                      ],
                      !isBlank && styles.timeRowBackground,
                      animatedStyle
                    ]}
                    {...(isDragging ? panResponder.panHandlers : {})}
                  >
                    <TouchableOpacity
                      activeOpacity={isEditMode ? 0.7 : 1}
                      onLongPress={() => !isBlank && rowData ? handleAthleteLongPress(rowData.id, athleteIndex) : undefined}
                      disabled={!isEditMode || isBlank}
                      style={[
                        styles.nameCell, 
                        isTablet && styles.nameCellTablet,
                        isLast && styles.lastNameCell,
                        isDragging && styles.nameCellDragging
                      ]}
                    >
                      <View style={[
                        styles.nameRowDivider,
                        isLast && styles.lastRowDivider
                      ]} />
                      <View style={styles.nameColumnDivider} />
                      {!isBlank && rowData && (
                        <View style={styles.nameTextContainer}>
                          {isEditMode && (
                            <Ionicons 
                              name="reorder-three-outline" 
                              size={isTablet ? 20 : 18} 
                              color={colors.neutralMedium} 
                              style={styles.dragHandle}
                            />
                          )}
                          <View style={styles.nameTextContent}>
                            <Text style={[baseStyles.text, styles.tableCell, styles.nameCellText, styles.firstNameText, isTablet && styles.tableCellTablet]}>
                              {rowData.firstName}
                            </Text>
                            <Text style={[baseStyles.text, styles.tableCell, styles.nameCellText, styles.lastNameText, isTablet && styles.tableCellTablet]}>
                              {rowData.lastName}
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
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
              {/* Show headers if columns exist or in edit mode */}
              {(workoutColumns.length > 0 || isEditMode) && (
                <>
                  {/* Header Row 1: Distances */}
                  <View style={[styles.tableHeaderRow, isTablet && styles.tableHeaderRowTablet]}>
                    {workoutColumns.map((column, colIndex) => (
                      <TouchableOpacity
                        key={`header-distance-${colIndex}`}
                        style={[
                          styles.headerCell, 
                          styles.dataHeaderCell,
                          colIndex === workoutColumns.length - 1 && styles.lastHeaderCell,
                          isEditMode && styles.headerCellEditable
                        ]}
                        onPress={() => {
                          if (isEditMode && selectedRank) {
                            // Find the index in the rank's customColumns array
                            const rankColumns = customColumns[selectedRank];
                            const customIndex = rankColumns.findIndex(c => c.id === column.id);
                            if (customIndex !== -1) {
                              Alert.alert(
                                'Column Options',
                                `What would you like to do with "${column.name || column.label || 'this column'}"?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Edit',
                                    onPress: () => handleEditColumn(column, customIndex),
                                  },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => column.id && handleDeleteColumn(column.id),
                                  },
                                ]
                              );
                            }
                          }
                        }}
                        activeOpacity={isEditMode ? 0.7 : 1}
                        disabled={!isEditMode}
                      >
                        <View style={styles.headerCellContent}>
                          <Text style={[styles.headerText, isTablet && styles.headerTextTablet]}>
                            {column.name || column.label || (column.distance ? `${column.distance}m` : 'Column')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    {/* Add Column Button in Edit Mode */}
                    {isEditMode && (
                      <TouchableOpacity
                        onPress={() => {
                          resetColumnForm();
                          setAddColumnModalVisible(true);
                        }}
                        style={[styles.addColumnButton, isTablet && styles.addColumnButtonTablet]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={isTablet ? 28 : 24} color={colors.white} />
                        <Text style={[styles.addColumnButtonText, isTablet && styles.addColumnButtonTextTablet]}>
                          Add
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Header Row 2: Percentages */}
                  <View style={[styles.tableHeaderRow, styles.percentageHeaderRow, isTablet && styles.tableHeaderRowTablet]}>
                    {workoutColumns.map((column, colIndex) => (
                      <View 
                        key={`header-percentage-${colIndex}`}
                        style={[
                          styles.headerCell, 
                          styles.dataHeaderCell,
                          colIndex === workoutColumns.length - 1 && styles.lastHeaderCell
                        ]}
                      >
                        <Text style={[styles.headerText, styles.percentageText, isTablet && styles.headerTextTablet]}>
                          {column.distance === 0 
                            ? '4' 
                            : column.percentage !== undefined 
                              ? `${Math.round(column.percentage * 100)}%`
                              : column.isMultiRepNoTime
                                ? '' // For multi-rep no-time columns, info shown in data area
                                : column.repNumber !== undefined
                                  ? `${Math.round((column.percentage || 0) * 100)}%`
                                  : column.time !== undefined
                                    ? `${Math.floor(column.time / 60)}:${(column.time % 60).toString().padStart(2, '0')}`
                                    : '--'
                          }
                        </Text>
                      </View>
                    ))}
                    {/* Spacer for Add Column button */}
                    {isEditMode && (
                      <View style={[styles.headerCell, styles.dataHeaderCell]} />
                    )}
                  </View>
                </>
              )}

              {/* Data Rows */}
              {displayAthletes.length === 0 ? null : (() => {
                // Create alternating rows: time, blank, time, blank... (2 rows per athlete)
                const totalRows = displayAthletes.length * 2;
                const rows: (Athlete | null)[] = [];
                for (let i = 0; i < totalRows; i++) {
                  if (i % 2 === 0) {
                    // Even indices: time rows (athletes)
                    const athleteIndex = i / 2;
                    rows.push(athleteIndex < displayAthletes.length ? displayAthletes[athleteIndex] : null);
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
                  const athleteIndex = Math.floor(index / 2);
                  const isDragging = draggingAthleteId === rowData?.id;
                  const animatedStyle = isDragging ? {
                    transform: [{ translateY: dragY }],
                    zIndex: 1000,
                    elevation: 10,
                  } : {};
                  
                  // Helper function to get input key for a cell
                  const getInputKey = (colIndex: number) => `${index}-${colIndex}`;
                  
                  // Helper function to get time difference value for display
                  const getTimeDifferenceValue = (colIndex: number): number | null => {
                    const key = getInputKey(colIndex);
                    // Check if key exists in the object
                    if (!(key in timeDifferences)) return null;
                    const value = timeDifferences[key];
                    // Return null if value is explicitly null or undefined
                    if (value === undefined || value === null) return null;
                    return value;
                  };
                  
                  // Helper function to format time difference for display
                  const formatTimeDifference = (value: number | null | undefined): string => {
                    if (value === null || value === undefined) return '--';
                    if (value === 0) return '😊'; // Smiley face for hitting goal time exactly
                    return value > 0 ? `+${value}` : `${value}`;
                  };
                  
                  return (
                    <Animated.View 
                      key={`data-row-${rowData?.id || index}-${index}`} 
                      style={[
                        styles.tableRow, 
                        isTablet && styles.tableRowTablet,
                        isFirst && styles.firstTableRow,
                        isLast && [styles.lastTableRow, isTablet && styles.lastTableRowTablet],
                        !isBlank && styles.timeRowBackground,
                        animatedStyle
                      ]}
                    >
                      <View style={[
                        styles.rowDivider,
                        isLast && styles.lastRowDivider
                      ]} />
                      {/* Dynamic columns based on workoutColumns */}
                      {workoutColumns.map((column, colIndex) => {
                        // Skip rendering edit/delete in data cells - those are only in header
                        const isLastColumn = colIndex === workoutColumns.length - 1;
                        const isStrides = column.distance === 0;
                        
                        return (
                          <View 
                            key={`data-cell-${index}-${colIndex}`}
                            style={[
                              styles.dataCell, 
                              isTablet && styles.dataCellTablet,
                              isLastColumn && styles.lastDataCell
                            ]}
                          >
                            {!isLastColumn && <View style={styles.columnDivider} />}
                            {isStrides ? (
                              // Strides column - intentionally blank
                              null
                            ) : !isBlank ? (
                              // Time row - show calculated time or custom column content
                              <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                                {column.distance && column.percentage !== undefined
                                  ? (column.distance > 400 
                                      ? formatTimeDisplay(goal1600m, column.distance, column.percentage)
                                      : calculateTime(goal1600m, column.distance, column.percentage))
                                  : column.isMultiRepNoTime
                                    ? '' // Multi-rep no-time: info shown in blank row below
                                    : column.percentage !== undefined
                                      ? '--' // Has percentage but no distance - calculated time not applicable
                                      : column.recordTime 
                                        ? '--' // Placeholder for custom time columns
                                        : '' // No percentage and no recordTime - leave blank (reps shown in header only)
                                }
                              </Text>
                            ) : (
                              // Blank row
                              column.isMultiRepNoTime ? (
                                // Multi-rep column without time recording - show reps and percentage
                                <Text style={[baseStyles.text, styles.tableCell, isTablet && styles.tableCellTablet]}>
                                  {column.reps !== undefined && column.reps > 0 
                                    ? `${column.reps} rep${column.reps > 1 ? 's' : ''}${column.percentage !== undefined ? `, ${Math.round(column.percentage * 100)}%` : ''}`
                                    : '--'
                                  }
                                </Text>
                              ) : column.recordTime ? (
                                // Show dropdown if recordTime is true
                                <TouchableOpacity
                                  style={[styles.dropdownButton, isTablet && styles.dropdownButtonTablet]}
                                  onPress={() => setOpenDropdown(getInputKey(colIndex))}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.dropdownButtonText, isTablet && styles.dropdownButtonTextTablet]}>
                                    {formatTimeDifference(getTimeDifferenceValue(colIndex))}
                                  </Text>
                                  <Ionicons name="chevron-down" size={isTablet ? 16 : 14} color={colors.text} />
                                </TouchableOpacity>
                              ) : (
                                // No percentage and no recordTime - leave blank (reps shown in header only)
                                <Text style={[baseStyles.text, styles.tableCell, isTablet && styles.tableCellTablet]}>
                                  {''}
                                </Text>
                              )
                            )}
                          </View>
                        );
                      })}
                    </Animated.View>
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
                    {/* Dynamic cooldown columns */}
                    {workoutColumns.map((column, colIndex) => {
                      const isLastColumn = colIndex === workoutColumns.length - 1;
                      return (
                        <View 
                          key={`cooldown-cell-${colIndex}`}
                          style={[
                            styles.dataCell, 
                            isTablet && styles.dataCellTablet,
                            isLastColumn && styles.lastDataCell
                          ]}
                        >
                          {!isLastColumn && <View style={styles.columnDivider} />}
                          <Text style={[baseStyles.text, styles.tableCell, styles.timeCellText, isTablet && styles.tableCellTablet]}>
                            {column.recoveryTime || '--'}
                          </Text>
                        </View>
                      );
                    })}
                    {/* Empty cell for Add Column button in edit mode */}
                    {isEditMode && (
                      <View 
                        style={[
                          styles.dataCell, 
                          isTablet && styles.dataCellTablet,
                          styles.lastDataCell
                        ]}
                      >
                        <View style={styles.columnDivider} />
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
          </ScrollView>
          </View>
          </View>
        </View>
      )}
      
      {/* Time Difference Dropdown Modal */}
      <Modal
        visible={openDropdown !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpenDropdown(null)}
        >
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={[baseStyles.text, styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                Seconds Over/Under Goal
              </Text>
              <TouchableOpacity
                style={[styles.modalCloseButton, isTablet && styles.modalCloseButtonTablet]}
                onPress={() => setOpenDropdown(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 24 : 20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={dropdownScrollRef}
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {TIME_DIFFERENCE_OPTIONS.map((option) => {
                const currentKey = openDropdown;
                const currentValue = currentKey ? (timeDifferences[currentKey] ?? null) : null;
                const isSelected = option.value === currentValue;
                
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                      isTablet && styles.modalOptionTablet
                    ]}
                    onPress={() => {
                      if (currentKey) {
                        setTimeDifferences(prev => ({ ...prev, [currentKey]: option.value }));
                      }
                      setOpenDropdown(null);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      isSelected && styles.modalOptionTextSelected,
                      isTablet && styles.modalOptionTextTablet
                    ]}>
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={isTablet ? 24 : 20} color={colors.secondary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add/Edit Column Modal */}
      <Modal
        visible={addColumnModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setAddColumnModalVisible(false);
          resetColumnForm();
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setAddColumnModalVisible(false);
            resetColumnForm();
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, isTablet && styles.modalContentTablet]}
          >
            <View style={styles.modalHeader}>
              <Text style={[baseStyles.text, styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                {editingColumnIndex !== null ? 'Edit Column' : 'Add Column'}
              </Text>
              <TouchableOpacity
                style={[styles.modalCloseButton, isTablet && styles.modalCloseButtonTablet]}
                onPress={() => {
                  setAddColumnModalVisible(false);
                  resetColumnForm();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 24 : 20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView} 
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name Input */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Name (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={newColumnName}
                  onChangeText={setNewColumnName}
                  placeholder="Enter column name"
                  placeholderTextColor={colors.neutralMedium}
                />
              </View>

              {/* Distance Input */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Distance (meters) (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={newColumnDistance}
                  onChangeText={setNewColumnDistance}
                  placeholder="Enter distance in meters"
                  placeholderTextColor={colors.neutralMedium}
                  keyboardType="numeric"
                />
              </View>

              {/* Reps Input */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Reps (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={newColumnReps}
                  onChangeText={setNewColumnReps}
                  placeholder="Enter number of reps"
                  placeholderTextColor={colors.neutralMedium}
                  keyboardType="numeric"
                />
              </View>

              {/* Percentage Input */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Percentage (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={newColumnPercentage}
                  onChangeText={setNewColumnPercentage}
                  placeholder="Enter percentage (e.g., 80 for 80%)"
                  placeholderTextColor={colors.neutralMedium}
                  keyboardType="numeric"
                />
              </View>

              {/* Time Input */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Time (seconds) (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={newColumnTime}
                  onChangeText={setNewColumnTime}
                  placeholder="Enter time in seconds"
                  placeholderTextColor={colors.neutralMedium}
                  keyboardType="numeric"
                />
              </View>

              {/* Record Time Toggle */}
              <View style={styles.modalInputGroup}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setNewColumnRecordTime(!newColumnRecordTime)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, newColumnRecordTime && styles.checkboxChecked]}>
                    {newColumnRecordTime && (
                      <Ionicons name="checkmark" size={isTablet ? 20 : 18} color={colors.white} />
                    )}
                  </View>
                  <Text style={[baseStyles.text, styles.checkboxLabel, isTablet && styles.checkboxLabelTablet]}>
                    Record Time?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Rank Selection - Required when adding, read-only when editing */}
              {editingColumnIndex === null ? (
                <View style={styles.modalInputGroup}>
                  <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                    Select Rank(s) <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <Text style={[baseStyles.text, styles.modalHint, isTablet && styles.modalHintTablet, { marginBottom: 12, fontSize: 12 }]}>
                    Select at least one rank. Column will be added to the end of each selected rank's columns.
                  </Text>
                  {(['rookie', 'veteran', 'varsity'] as const).map(rank => (
                    <TouchableOpacity
                      key={rank}
                      style={styles.checkboxContainer}
                      onPress={() => setSelectedRanksForColumn(prev => ({
                        ...prev,
                        [rank]: !prev[rank],
                      }))}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, selectedRanksForColumn[rank] && styles.checkboxChecked]}>
                        {selectedRanksForColumn[rank] && (
                          <Ionicons name="checkmark" size={isTablet ? 20 : 18} color={colors.white} />
                        )}
                      </View>
                      <Text style={[baseStyles.text, styles.checkboxLabel, isTablet && styles.checkboxLabelTablet]}>
                        {rank.charAt(0).toUpperCase() + rank.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.modalInputGroup}>
                  <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                    Rank
                  </Text>
                  <Text style={[baseStyles.text, styles.infoValue, isTablet && styles.infoValueTablet]}>
                    {editingColumnRank ? editingColumnRank.charAt(0).toUpperCase() + editingColumnRank.slice(1) : 'N/A'}
                  </Text>
                  <Text style={[baseStyles.text, styles.modalHint, isTablet && styles.modalHintTablet, { marginTop: 4, fontSize: 12 }]}>
                    Rank cannot be changed when editing a column.
                  </Text>
                </View>
              )}

              {/* Recovery Time Input - Required */}
              <View style={styles.modalInputGroup}>
                <Text style={[baseStyles.text, styles.modalLabel, isTablet && styles.modalLabelTablet]}>
                  Recovery Time <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.modalInput, isTablet && styles.modalInputTablet]}
                  value={newColumnRecoveryTime}
                  onChangeText={setNewColumnRecoveryTime}
                  placeholder="MM:SS (e.g., 2:00 or 2:15)"
                  placeholderTextColor={colors.neutralMedium}
                />
                <Text style={[baseStyles.text, styles.modalHint, isTablet && styles.modalHintTablet, { marginTop: 4, fontSize: 12 }]}>
                  Required. Enter recovery time in MM:SS format.
                </Text>
              </View>

              <Text style={[baseStyles.text, styles.modalHint, isTablet && styles.modalHintTablet]}>
                Note: Either name or distance must be provided.
              </Text>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setAddColumnModalVisible(false);
                    resetColumnForm();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[baseStyles.text, styles.modalButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleAddColumn}
                  activeOpacity={0.7}
                >
                  <Text style={[baseStyles.text, styles.modalButtonText, styles.modalButtonTextSave]}>
                    {editingColumnIndex !== null ? 'Save' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
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
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  filterButtonTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  table: {
    backgroundColor: colors.neutralLight,
    borderTopLeftRadius: 0, // No radius on left edge for mobile
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 0, // No radius on left edge for mobile
    borderBottomRightRadius: 14,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.1)',
    shadowColor: colors.primary,
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
    backgroundColor: colors.neutralLight,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
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
    color: colors.white,
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
    borderBottomColor: colors.neutralBackground,
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
    color: colors.text,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  nameTextContent: {
    flex: 1,
  },
  dragHandle: {
    marginRight: 8,
  },
  nameCellDragging: {
    opacity: 0.8,
    backgroundColor: colors.neutralLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  timeRowBackground: {
    backgroundColor: 'rgba(30, 58, 95, 0.04)', // Light blue-gray background for time rows
  },
  cooldownRowBackground: {
    backgroundColor: 'rgba(30, 58, 95, 0.12)', // Blueish background for cooldown row
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutralBackground,
    minHeight: 36,
    width: '100%',
  },
  dropdownButtonTablet: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginRight: 6,
    fontFamily: 'monospace',
  },
  dropdownButtonTextTablet: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.neutralLight,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  modalContentTablet: {
    padding: 32,
    borderRadius: 24,
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingRight: 40, // Space for close button
  },
  modalCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutralBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.neutralMedium,
  },
  modalCloseButtonTablet: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  modalTitleTablet: {
    fontSize: 24,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.neutralBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalOptionTablet: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  modalOptionSelected: {
    backgroundColor: colors.neutralLight,
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  modalOptionTextTablet: {
    fontSize: 18,
  },
  modalOptionTextSelected: {
    color: colors.secondary,
    fontWeight: '700',
  },
  emptyStateContainer: {
    paddingHorizontal: 16,
  },
  emptyStateTable: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyStateTextTablet: {
    fontSize: 18,
  },
  headerCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  addColumnButton: {
    width: 90,
    minWidth: 90,
    height: 44,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addColumnButtonTablet: {
    width: 100,
    minWidth: 100,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  addColumnButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addColumnButtonTextTablet: {
    fontSize: 16,
  },
  headerCellEditable: {
    opacity: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.neutralMedium,
    borderRadius: 4,
    backgroundColor: colors.neutralLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  checkboxLabelTablet: {
    fontSize: 18,
  },
  modalHint: {
    fontSize: 14,
    color: colors.neutralMedium,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 16,
  },
  modalHintTablet: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutralBackground,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.neutralLight,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextSave: {
    color: colors.white,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  modalLabelTablet: {
    fontSize: 18,
  },
  modalInput: {
    backgroundColor: colors.neutralLight,
    borderWidth: 1,
    borderColor: colors.neutralBackground,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  modalInputTablet: {
    paddingVertical: 14,
    fontSize: 18,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  infoValueTablet: {
    fontSize: 18,
  },
});

