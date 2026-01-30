/**
 * User Role context for coach/athlete role with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getUserRole, initializeUserRole, setUserRole, UserRole } from '../data/user';

const STORAGE_KEY = '@user_role';

type UserRoleContextType = {
  userRole: UserRole;
  isCoach: boolean;
  isAthlete: boolean;
  /** True when viewing as head coach (or when logged-in coach is head coach). */
  isHeadCoach: boolean;
  setRole: (role: UserRole) => Promise<void>;
  refreshRole: () => Promise<void>;
};

const UserRoleContext = createContext<UserRoleContextType | null>(null);

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRoleState] = useState<UserRole>('coach');

  useEffect(() => {
    const load = async () => {
      await initializeUserRole();
      setUserRoleState(getUserRole());
    };
    load();
  }, []);

  const setRole = useCallback(async (role: UserRole) => {
    await setUserRole(role);
    setUserRoleState(role);
  }, []);

  const refreshRole = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const role = (stored || 'coach') as UserRole;
      setUserRoleState(role);
    } catch (error) {
      console.error('Error refreshing user role:', error);
      setUserRoleState('coach');
    }
  }, []);

  return (
    <UserRoleContext.Provider 
      value={{ 
        userRole, 
        isCoach: userRole === 'coach' || userRole === 'head_coach' || userRole === 'developer',
        isAthlete: userRole === 'athlete',
        isHeadCoach: userRole === 'head_coach' || userRole === 'developer',
        setRole,
        refreshRole
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextType {
  const ctx = useContext(UserRoleContext);
  if (!ctx) {
    throw new Error('useUserRole must be used within UserRoleProvider');
  }
  return ctx;
}
