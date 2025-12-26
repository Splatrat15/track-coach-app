import { StyleSheet, Text, View } from 'react-native';
import { Colors, baseStyles } from '../../constants/styles';
import { Exercise } from '../../data/types';

interface LongRunProps {
  isTablet: boolean;
  exercises: Exercise[];
}

export default function LongRun({ isTablet, exercises }: LongRunProps) {
  return (
    <View style={styles.container}>
      {exercises.length === 0 ? (
        <Text style={[baseStyles.text, styles.text, isTablet && styles.textTablet]}>
          No long run exercises
        </Text>
      ) : (
        exercises.map((exercise, index) => {
          const isGroupedWorkout = exercise.group && exercise.pace && exercise.duration;
          
          return (
            <View 
              key={exercise.id || index} 
              style={[
                styles.exerciseItem,
                index === exercises.length - 1 && styles.exerciseItemLast
              ]}
            >
              {isGroupedWorkout ? (
                <>
                  <View style={styles.groupedWorkoutHeader}>
                    <Text style={[baseStyles.text, styles.groupName]}>
                      {exercise.name}
                    </Text>
                    <Text style={[baseStyles.text, styles.groupDuration]}>
                      {exercise.duration} min
                    </Text>
                  </View>
                  <Text style={[baseStyles.text, styles.paceType]}>
                    {exercise.pace ? exercise.pace.charAt(0).toUpperCase() + exercise.pace.slice(1).replace(/-/g, ' ') : ''}
                  </Text>
                </>
              ) : (
                <Text style={[baseStyles.text, styles.exerciseName]}>
                  {exercise.name}
                </Text>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  text: {
    fontSize: 16,
    opacity: 0.75,
    fontStyle: 'italic',
  },
  textTablet: {
    fontSize: 18,
  },
  exerciseItem: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.neutralBackground,
    paddingLeft: 4,
  },
  exerciseItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  exerciseName: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  groupedWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: Colors.neutralBackground,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  groupName: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  groupDuration: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  paceType: {
    fontSize: 16,
    color: Colors.secondary,
    opacity: 0.9,
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 6,
    paddingLeft: 4,
  },
});

