import { Ionicons } from '@expo/vector-icons';
import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Platform, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserRole } from '../../contexts/UserRoleContext';

export default function TabLayout() {
  const { colors } = useTheme();
  const { userRole, refreshRole } = useUserRole();

  useFocusEffect(
    useCallback(() => {
      refreshRole();
    }, [refreshRole])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.neutralLight,
          borderTopWidth: 2,
          borderTopColor: colors.neutralMedium,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 92 : 72,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        headerStyle: {
          backgroundColor: colors.primary,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 8,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 20,
          letterSpacing: -0.3,
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <Ionicons 
              name={userRole === 'developer' ? 'code-slash' : userRole === 'coach' || userRole === 'head_coach' ? 'people' : 'person'} 
              size={18} 
              color={colors.white} 
              style={{ marginRight: 6 }}
            />
            <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>
              {userRole === 'developer' ? 'Developer' : userRole === 'head_coach' ? 'Head coach' : userRole === 'coach' ? 'Coach' : 'Athlete'}
            </Text>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance/[id]"
        options={{
          href: null, // Hide from tab bar
          headerShown: false, // Hide header, we have custom Go Back button
        }}
      />
      <Tabs.Screen
        name="oyo"
        options={{
          href: null, // Hide from tab bar
          headerShown: false, // Hide header, we have custom header
        }}
      />
      <Tabs.Screen
        name="oyo/[id]"
        options={{
          href: null, // Hide from tab bar
          headerShown: false, // Hide header, we have custom Go Back button
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarLabel: 'Workout',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="everyone"
        options={{
          href: null, // Hide from tab bar
          headerShown: false, // Hide header, we have custom header
        }}
      />
      <Tabs.Screen
        name="everyone/[id]"
        options={{
          href: null, // Hide from tab bar
          headerShown: false, // Hide header, we have custom header
        }}
      />
      <Tabs.Screen
        name="everyone/coach/[id]"
        options={{
          href: null, // Hide from tab bar
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

