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
    marginTop: 24,
  },
  text: {
    fontSize: 16,
  },
  textTablet: {
    fontSize: 18,
  },
  exerciseItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBackground,
  },
  exerciseItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: Colors.text,
  },
  groupedWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  groupDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  paceType: {
    fontSize: 16,
    color: Colors.text,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});

